"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { PlusIcon } from "@phosphor-icons/react";
import { createClaim, getClaimDetail, saveExpenses, updateClaim } from "@/apis/claim";
import { getClaimableCategories } from "@/apis/category";
import { createSplitRequest } from "@/apis/split-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { MAX_CLAIM_NAME_LENGTH, MAX_EXPENSE_COUNT, MIN_CLAIM_NAME_LENGTH } from "@/utils/constants/claim.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimableCategory, ClaimType } from "@/types/claim.type";
import { ExpensePanel } from "./expense-panel";
import { isExpenseComplete } from "./expense-completeness";
import type { LocalExpense } from "./local-expense.type";
import { SplitClaimDialog } from "./split-claim-dialog";
import { SplitExpenseDialog } from "./split-expense-dialog";
import type { SplitMember } from "./split-percentage-table";
import { TripSelect, type TripSelectValue } from "./trip-select";

type ClaimManualFormProps = { mode: "create" } | { mode: "edit"; claimId: number };

function blankExpense(): LocalExpense {
  return { categoryId: null, paidBy: null, fieldValues: {} };
}

// 022's Manual Add Claim — shared by /claims/new/manual (create) and
// /claims/[id]/manual (reopening a still-draft claim, whether it was
// originally created manually or via the AI flow — 022's own "only Draft is
// editable" rule applies identically either way).
export function ClaimManualForm(props: ClaimManualFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [claimId, setClaimId] = useState<number | null>(isEdit ? props.claimId : null);
  const [claimType, setClaimType] = useState<ClaimType>("standalone");
  const [name, setName] = useState("");
  const [trip, setTrip] = useState<TripSelectValue | null>(null);
  const [expenses, setExpenses] = useState<LocalExpense[]>([blankExpense()]);

  const [categories, setCategories] = useState<ClaimableCategory[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

  const [splitExpenseIndex, setSplitExpenseIndex] = useState<number | null>(null);
  const [isSplitClaimOpen, setIsSplitClaimOpen] = useState(false);
  // Splits chosen via "Yes, Submit" in either dialog are staged here, not
  // sent to the backend yet — the actual split-request rows (and their
  // colleague emails) are only created once Save Claim succeeds, keyed by
  // this array's index since a brand-new expense has no id until then.
  const [pendingExpenseSplits, setPendingExpenseSplits] = useState<Record<number, SplitMember[]>>({});
  const [pendingClaimSplit, setPendingClaimSplit] = useState<SplitMember[] | null>(null);

  useEffect(() => {
    getClaimableCategories()
      .then((response) => setCategories(response.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let isMounted = true;
    getClaimDetail(props.claimId)
      .then(({ claim }) => {
        if (!isMounted) return;
        if (claim.status !== "draft") {
          toast.error("Only draft claims can be edited.");
          router.replace(ROUTES.CLAIMS);
          return;
        }
        setClaimType(claim.claimType);
        setName(claim.name ?? "");
        setTrip(claim.tripId ? { id: claim.tripId, name: claim.tripName ?? "" } : null);
        setExpenses(
          claim.expenses.length > 0
            ? claim.expenses.map((expense) => ({
                id: expense.id,
                categoryId: expense.categoryId,
                paidBy: expense.paidBy,
                fieldValues: expense.fieldValues,
                amount: expense.amount,
                isRedFlagged: expense.isRedFlagged,
                redFlagReason: expense.redFlagReason,
              }))
            : [blankExpense()]
        );
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
        router.replace(ROUTES.CLAIMS);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  function updateExpense(index: number, patch: Partial<LocalExpense>): void {
    setExpenses((previous) => previous.map((expense, expenseIndex) => (expenseIndex === index ? { ...expense, ...patch } : expense)));
  }

  function addExpense(): void {
    if (expenses.length >= MAX_EXPENSE_COUNT) {
      toast.error("You've reached the maximum of 10 expenses.");
      return;
    }
    setExpenses((previous) => [...previous, blankExpense()]);
  }

  function removeExpense(index: number): void {
    setExpenses((previous) => previous.filter((_, expenseIndex) => expenseIndex !== index));
    setPendingExpenseSplits((previous) => {
      const next: Record<number, SplitMember[]> = {};
      Object.entries(previous).forEach(([key, value]) => {
        const keyIndex = Number(key);
        if (keyIndex === index) return;
        next[keyIndex > index ? keyIndex - 1 : keyIndex] = value;
      });
      return next;
    });
  }

  async function refetchClaim(id: number): Promise<LocalExpense[]> {
    const { claim } = await getClaimDetail(id);
    const freshExpenses = claim.expenses.map((expense) => ({
      id: expense.id,
      categoryId: expense.categoryId,
      paidBy: expense.paidBy,
      fieldValues: expense.fieldValues,
      amount: expense.amount,
      isRedFlagged: expense.isRedFlagged,
      redFlagReason: expense.redFlagReason,
    }));
    setExpenses(freshExpenses);
    return freshExpenses;
  }

  // Split requests are created (and their colleague emails sent) only once
  // Save Claim actually succeeds — never at "Yes, Submit" time — so the
  // dialogs open instantly with no persist step; nothing here calls the
  // split-request API until the claim itself is saved. Keyed by whatever
  // this array's index was after the just-completed save/refetch, matching
  // pendingExpenseSplits's own indexing.
  async function submitPendingSplits(id: number, freshExpenses: LocalExpense[]): Promise<void> {
    const tasks: Promise<unknown>[] = [];
    Object.entries(pendingExpenseSplits).forEach(([indexKey, members]) => {
      const expense = freshExpenses[Number(indexKey)];
      if (expense?.id) {
        tasks.push(
          createSplitRequest(id, expense.id, {
            splitType: "percentage",
            members: members.map((member) => ({ employeeId: member.employeeId, percentage: member.percentage })),
          })
        );
      }
    });
    if (pendingClaimSplit) {
      freshExpenses.forEach((expense) => {
        if (expense.id) {
          tasks.push(
            createSplitRequest(id, expense.id, {
              splitType: "percentage",
              members: pendingClaimSplit.map((member) => ({ employeeId: member.employeeId, percentage: member.percentage })),
            })
          );
        }
      });
    }
    if (tasks.length === 0) return;
    const results = await Promise.allSettled(tasks);
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) {
      toast.warning(`${failed} split request${failed === 1 ? "" : "s"} couldn't be sent — reopen this claim's Edit page to retry.`);
    }
  }

  async function persistClaimShell(isDraftSave: boolean): Promise<number | null> {
    if (claimType === "standalone") {
      const trimmed = name.trim();
      if (!isDraftSave && (trimmed.length < MIN_CLAIM_NAME_LENGTH || trimmed.length > MAX_CLAIM_NAME_LENGTH)) {
        toast.error("Claim Name is required.");
        return null;
      }
    } else if (!isDraftSave && !trip) {
      toast.error("Select a trip.");
      return null;
    }

    const payload = {
      claimType,
      name: claimType === "standalone" ? name.trim() || undefined : undefined,
      tripId: claimType === "trip_linked" ? (trip?.id ?? undefined) : undefined,
      isDraftSave,
    };

    if (claimId === null) {
      const response = await createClaim(payload);
      setClaimId(response.id);
      return response.id;
    }
    await updateClaim(claimId, payload);
    return claimId;
  }

  async function handleSave(isDraftSave: boolean): Promise<void> {
    const setSubmitting = isDraftSave ? setIsSubmittingDraft : setIsSubmittingFinal;
    setSubmitting(true);
    try {
      const id = await persistClaimShell(isDraftSave);
      if (id === null) return;

      const response = await saveExpenses(id, {
        isDraftSave,
        expenses: expenses.map((expense) => ({
          id: expense.id,
          categoryId: expense.categoryId ?? 0,
          paidBy: expense.paidBy ?? "self",
          fieldValues: expense.fieldValues,
        })),
      });

      if (response.duplicates.length > 0) {
        response.duplicates.forEach((duplicate) => {
          toast.warning(`Possible duplicate bill — ${duplicate.claimantName}'s claim on ${duplicate.expenseDate ?? "an earlier date"} has the same details.`);
        });
      }

      if (isDraftSave) {
        toast.success("Claim saved as draft.");
        if (!isEdit) router.replace(ROUTES.claimManualEdit(id));
        await refetchClaim(id);
      } else {
        if (Object.keys(pendingExpenseSplits).length > 0 || pendingClaimSplit) {
          const freshExpenses = await refetchClaim(id);
          await submitPendingSplits(id, freshExpenses);
        }
        toast.success("Claim saved.");
        router.push(ROUTES.CLAIMS);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel(): void {
    router.push(ROUTES.CLAIMS);
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  const canSplitClaim =
    expenses.length > 0 && expenses.every((expense) => isExpenseComplete(expense, categories.find((category) => category.id === expense.categoryId) ?? null));

  return (
    <Stack spacing={4} sx={{ mx: "auto", maxWidth: 896, px: 3, py: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
          {isEdit ? "Edit Claim" : "Add Manually"}
        </Typography>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsSplitClaimOpen(true)} disabled={!canSplitClaim}>
          {pendingClaimSplit ? "Edit Claim Split" : "Split Claim"}
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        <Label>Claim Type</Label>
        <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
          {(
            [
              { value: "standalone" as const, label: "Create New Claim" },
              { value: "trip_linked" as const, label: "Link to Trip" },
            ] as const
          ).map((option) => (
            <Box component="label" key={option.value} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input type="radio" name="claim-type" checked={claimType === option.value} onChange={() => setClaimType(option.value)} />
              {option.label}
            </Box>
          ))}
        </Stack>
      </Stack>

      {claimType === "standalone" ? (
        <Stack spacing={1} sx={{ maxWidth: 448 }}>
          <Label htmlFor="claim-name">Claim Name</Label>
          <Input id="claim-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={MAX_CLAIM_NAME_LENGTH} />
        </Stack>
      ) : (
        <Stack spacing={1} sx={{ maxWidth: 448 }}>
          <Label>Trip Name</Label>
          <TripSelect value={trip} onChange={setTrip} placeholder="Select trip" />
        </Stack>
      )}

      <Stack spacing={2}>
        {expenses.map((expense, index) => (
          <ExpensePanel
            key={expense.id ?? `new-${index}`}
            index={index}
            expense={expense}
            categories={categories}
            onChange={(patch) => updateExpense(index, patch)}
            onRemove={() => removeExpense(index)}
            onSplit={() => setSplitExpenseIndex(index)}
            hasPendingSplit={Boolean(pendingExpenseSplits[index])}
            canRemove={expenses.length > 1}
          />
        ))}
        <Button type="button" variant="outline" onClick={addExpense} disabled={expenses.length >= MAX_EXPENSE_COUNT}>
          <PlusIcon size={16} /> Add Expense
        </Button>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", borderTop: 1, borderColor: "divider", pt: 3 }}>
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" disabled={isSubmittingDraft || isSubmittingFinal} onClick={() => handleSave(true)}>
          {isSubmittingDraft ? <Spinner /> : null}
          Save as Draft
        </Button>
        <Button type="button" disabled={isSubmittingDraft || isSubmittingFinal} onClick={() => handleSave(false)}>
          {isSubmittingFinal ? <Spinner /> : null}
          Save Claim
        </Button>
      </Stack>

      <SplitExpenseDialog
        expense={splitExpenseIndex !== null ? expenses[splitExpenseIndex] : null}
        categories={categories}
        initialMembers={splitExpenseIndex !== null ? pendingExpenseSplits[splitExpenseIndex] : undefined}
        onOpenChange={(open) => !open && setSplitExpenseIndex(null)}
        onConfirm={(members) => {
          if (splitExpenseIndex !== null) setPendingExpenseSplits((previous) => ({ ...previous, [splitExpenseIndex]: members }));
        }}
      />
      <SplitClaimDialog
        expenses={expenses}
        categories={categories}
        initialMembers={pendingClaimSplit ?? undefined}
        open={isSplitClaimOpen}
        onOpenChange={setIsSplitClaimOpen}
        onConfirm={setPendingClaimSplit}
      />
    </Stack>
  );
}

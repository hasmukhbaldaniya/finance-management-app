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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { MAX_CLAIM_NAME_LENGTH, MAX_EXPENSE_COUNT, MIN_CLAIM_NAME_LENGTH } from "@/utils/constants/claim.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimableCategory, ClaimType } from "@/types/claim.type";
import { ExpensePanel } from "./expense-panel";
import type { LocalExpense } from "./local-expense.type";
import { SplitClaimDialog } from "./split-claim-dialog";
import { SplitExpenseDialog } from "./split-expense-dialog";
import { SplitWithColleaguesDialog } from "./split-with-colleagues-dialog";
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

  const [splitExpenseTarget, setSplitExpenseTarget] = useState<LocalExpense | null>(null);
  const [splitWithColleaguesTarget, setSplitWithColleaguesTarget] = useState<LocalExpense | null>(null);
  const [isSplitClaimOpen, setIsSplitClaimOpen] = useState(false);

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
  }

  async function refetchClaim(id: number): Promise<void> {
    const { claim } = await getClaimDetail(id);
    setExpenses(
      claim.expenses.map((expense) => ({
        id: expense.id,
        categoryId: expense.categoryId,
        paidBy: expense.paidBy,
        fieldValues: expense.fieldValues,
        amount: expense.amount,
        isRedFlagged: expense.isRedFlagged,
        redFlagReason: expense.redFlagReason,
      }))
    );
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

  return (
    <Stack spacing={4} sx={{ mx: "auto", maxWidth: 896, px: 3, py: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
          {isEdit ? "Edit Claim" : "Add Manually"}
        </Typography>
        {claimId !== null ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsSplitClaimOpen(true)} disabled={expenses.length < 2}>
            Move to New Claim
          </Button>
        ) : null}
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
            onSplit={() => setSplitExpenseTarget(expense)}
            onSplitWithColleagues={() => setSplitWithColleaguesTarget(expense)}
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
        claimId={claimId ?? 0}
        expense={splitExpenseTarget}
        categories={categories}
        onOpenChange={(open) => !open && setSplitExpenseTarget(null)}
        onSplit={() => claimId !== null && refetchClaim(claimId)}
      />
      <SplitWithColleaguesDialog
        claimId={claimId ?? 0}
        expense={splitWithColleaguesTarget}
        onOpenChange={(open) => !open && setSplitWithColleaguesTarget(null)}
        onSplit={() => setSplitWithColleaguesTarget(null)}
      />
      {claimId !== null ? (
        <SplitClaimDialog claimId={claimId} expenses={expenses} categories={categories} open={isSplitClaimOpen} onOpenChange={setIsSplitClaimOpen} />
      ) : null}
    </Stack>
  );
}

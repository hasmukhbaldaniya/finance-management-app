"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowsMergeIcon, ArrowsSplitIcon, WarningCircleIcon } from "@phosphor-icons/react";
import {
  checkExpenseDuplicate,
  getClaimDetail,
  getInvoiceFiles,
  getProcessingStatus,
  mergeInvoicePages,
  saveExpenses,
  unmergeInvoicePages,
} from "@/apis/claim";
import { getClaimableCategories } from "@/apis/category";
import { AiProcessingPipeline } from "@/components/claim/ai-processing-pipeline";
import { CategorySelect } from "@/components/claim/category-select";
import { ExpenseDynamicForm } from "@/components/claim/expense-dynamic-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getInvoiceFileContentUrl } from "@/apis/claim/invoiceFileContentUrl";
import { formatInr } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimableCategory, ClaimInvoiceFile, DuplicateMatch, Expense } from "@/types/claim.type";
import type { LocalExpense } from "@/components/claim/local-expense.type";

const POLL_INTERVAL_MS = 1500;

function localExpenseFromDetail(expense: Expense): LocalExpense {
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    paidBy: expense.paidBy,
    fieldValues: expense.fieldValues,
    amount: expense.amount,
    isRedFlagged: expense.isRedFlagged,
    redFlagReason: expense.redFlagReason,
    sourceInvoiceFileId: expense.sourceInvoiceFileId,
    sourcePageNumber: expense.sourcePageNumber,
    mergedFromExpenseIds: expense.mergedFromExpenseIds,
  };
}

// 023's AI Processing Pipeline + Review & Edit AI-Extracted Expenses,
// combined into one screen — the processing story ends by auto-advancing
// into the review step, so there's no real navigation boundary between them.
export function AiReviewScreen({ claimId }: { claimId: number }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<Awaited<ReturnType<typeof getProcessingStatus>> | null>(null);

  const [categories, setCategories] = useState<ClaimableCategory[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<ClaimInvoiceFile[]>([]);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<number[]>([]);
  const [autoFilledByExpense, setAutoFilledByExpense] = useState<Record<number, Set<number>>>({});
  const [duplicateByExpense, setDuplicateByExpense] = useState<Record<number, DuplicateMatch | null>>({});

  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getClaimableCategories()
      .then((response) => setCategories(response.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function poll(): Promise<void> {
      try {
        const status = await getProcessingStatus(claimId);
        if (!isMounted) return;
        setProcessingStatus(status);
        if (status.isComplete) {
          await loadReviewData(true);
          if (isMounted) setIsProcessing(false);
          return;
        }
        pollTimeout.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (error) {
        if (!isMounted) return;
        toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      }
    }

    void poll();
    return () => {
      isMounted = false;
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  async function loadReviewData(markAutoFilled: boolean): Promise<void> {
    const [{ claim }, { files }] = await Promise.all([getClaimDetail(claimId), getInvoiceFiles(claimId)]);
    const nextExpenses = claim.expenses.map(localExpenseFromDetail);
    setExpenses(nextExpenses);
    setInvoiceFiles(files);
    if (nextExpenses.length > 0 && !nextExpenses.some((expense) => expense.id === selectedExpenseId)) {
      setSelectedExpenseId(nextExpenses[0]!.id!);
    }

    if (markAutoFilled) {
      const nextAutoFilled: Record<number, Set<number>> = {};
      nextExpenses.forEach((expense) => {
        nextAutoFilled[expense.id!] = new Set(
          Object.entries(expense.fieldValues)
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .map(([fieldId]) => Number(fieldId))
        );
      });
      setAutoFilledByExpense(nextAutoFilled);
    }

    const duplicates: Record<number, DuplicateMatch | null> = {};
    await Promise.all(
      nextExpenses.map(async (expense) => {
        if (!expense.id) return;
        try {
          const { duplicate } = await checkExpenseDuplicate(claimId, expense.id);
          duplicates[expense.id] = duplicate ? { ...duplicate, expenseId: expense.id } : null;
        } catch {
          duplicates[expense.id] = null;
        }
      })
    );
    setDuplicateByExpense(duplicates);
  }

  function updateExpense(expenseId: number, patch: Partial<LocalExpense>): void {
    setExpenses((previous) => previous.map((expense) => (expense.id === expenseId ? { ...expense, ...patch } : expense)));
  }

  function clearAutoFilled(expenseId: number, fieldId: number): void {
    setAutoFilledByExpense((previous) => {
      const next = new Set(previous[expenseId]);
      next.delete(fieldId);
      return { ...previous, [expenseId]: next };
    });
  }

  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId) ?? null;
  const selectedCategory = categories.find((category) => category.id === selectedExpense?.categoryId) ?? null;
  const selectedInvoiceFile = invoiceFiles.find((file) => file.id === selectedExpense?.sourceInvoiceFileId) ?? null;
  const totalAmount = expenses.reduce((total, expense) => total + Number(expense.amount ?? 0), 0);

  async function handleMerge(fileId: number): Promise<void> {
    setIsMerging(true);
    try {
      const pageNumbers = expenses.filter((expense) => selectedForMerge.includes(expense.id!)).map((expense) => expense.sourcePageNumber!);
      await mergeInvoicePages(claimId, fileId, pageNumbers);
      toast.success("Pages merged.");
      setSelectedForMerge([]);
      await loadReviewData(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsMerging(false);
    }
  }

  async function handleUnmerge(expenseId: number): Promise<void> {
    setIsMerging(true);
    try {
      await unmergeInvoicePages(claimId, expenseId);
      toast.success("Pages unmerged.");
      await loadReviewData(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsMerging(false);
    }
  }

  async function handleSave(isDraftSave: boolean): Promise<void> {
    const setSubmitting = isDraftSave ? setIsSubmittingDraft : setIsSubmittingFinal;
    setSubmitting(true);
    try {
      const response = await saveExpenses(claimId, {
        isDraftSave,
        expenses: expenses.map((expense) => ({
          id: expense.id,
          categoryId: expense.categoryId ?? 0,
          paidBy: expense.paidBy ?? "self",
          fieldValues: expense.fieldValues,
        })),
      });
      response.duplicates.forEach((duplicate) => {
        toast.warning(`Possible duplicate bill — ${duplicate.claimantName}'s claim on ${duplicate.expenseDate ?? "an earlier date"} has the same details.`);
      });
      if (isDraftSave) {
        toast.success("Claim saved as draft.");
        await loadReviewData(false);
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

  if (isProcessing) {
    return <AiProcessingPipeline status={processingStatus} />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Review Expenses</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            Total Expenses <span className="font-semibold text-foreground">{expenses.length}</span>
          </span>
          <span>
            Total Amount <span className="font-semibold text-foreground">₹{formatInr(totalAmount)}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_1fr]">
        {/* Invoices column */}
        <div className="space-y-4 overflow-y-auto rounded-lg border border-border p-3">
          {invoiceFiles.map((file) => {
            const fileExpenses = expenses
              .filter((expense) => expense.sourceInvoiceFileId === file.id)
              .sort((a, b) => (a.sourcePageNumber ?? 0) - (b.sourcePageNumber ?? 0));
            const mergeableIds = fileExpenses.filter((expense) => file.fileType === "pdf" && expense.sourcePageNumber !== null).map((expense) => expense.id!);
            const canMerge = selectedForMerge.length >= 2 && selectedForMerge.every((id) => mergeableIds.includes(id));

            return (
              <div key={file.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-muted-foreground">{file.originalFileName}</p>
                  {canMerge ? (
                    <button
                      type="button"
                      onClick={() => handleMerge(file.id)}
                      disabled={isMerging}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ArrowsMergeIcon size={12} /> Merge
                    </button>
                  ) : null}
                </div>
                {fileExpenses.map((expense) => {
                  const isMergedRow = Array.isArray(expense.mergedFromExpenseIds) && expense.mergedFromExpenseIds.length > 0;
                  const canCheckMerge = file.fileType === "pdf" && expense.sourcePageNumber !== null;
                  return (
                    <button
                      key={expense.id}
                      type="button"
                      onClick={() => setSelectedExpenseId(expense.id!)}
                      className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs ${
                        selectedExpenseId === expense.id ? "border-primary bg-primary/5" : "border-border"
                      } ${expense.isRedFlagged ? "border-red-400" : ""}`}
                    >
                      {canCheckMerge ? (
                        <input
                          type="checkbox"
                          checked={selectedForMerge.includes(expense.id!)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() =>
                            setSelectedForMerge((previous) =>
                              previous.includes(expense.id!) ? previous.filter((id) => id !== expense.id) : [...previous, expense.id!]
                            )
                          }
                        />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">
                        {categories.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized"}
                        {expense.sourcePageNumber ? ` — Page ${expense.sourcePageNumber}` : ""}
                      </span>
                      {expense.isRedFlagged ? <WarningCircleIcon size={14} className="shrink-0 text-red-600" /> : null}
                      {isMergedRow ? (
                        <span
                          role="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleUnmerge(expense.id!);
                          }}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          title="Unmerge"
                        >
                          <ArrowsSplitIcon size={14} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Preview column */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-3">
          {selectedInvoiceFile ? (
            <div className="flex w-full flex-col items-center gap-2">
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">AI-Processed</span>
              {selectedInvoiceFile.fileType === "pdf" ? (
                <iframe title="Invoice preview" src={getInvoiceFileContentUrl(claimId, selectedInvoiceFile.id)} className="h-[60vh] w-full rounded-md border border-border" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getInvoiceFileContentUrl(claimId, selectedInvoiceFile.id)}
                  alt={selectedInvoiceFile.originalFileName}
                  className="max-h-[60vh] w-full rounded-md border border-border object-contain"
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an invoice to preview.</p>
          )}
        </div>

        {/* Expense Form column */}
        <div className="space-y-4 overflow-y-auto rounded-lg border border-border p-4">
          {selectedExpense ? (
            <>
              {duplicateByExpense[selectedExpense.id!] ? (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                  <WarningCircleIcon size={16} className="mt-0.5 shrink-0" />
                  <span>
                    This looks like a bill you&apos;ve already claimed — {duplicateByExpense[selectedExpense.id!]!.claimantName}&apos;s claim on{" "}
                    {duplicateByExpense[selectedExpense.id!]!.expenseDate ?? "an earlier date"} has the same details.
                  </span>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">Category</p>
                <CategorySelect
                  categories={categories}
                  value={selectedExpense.categoryId}
                  onChange={(categoryId) => updateExpense(selectedExpense.id!, { categoryId, fieldValues: {} })}
                />
              </div>

              {selectedCategory ? (
                <ExpenseDynamicForm
                  fields={selectedCategory.fields}
                  fieldValues={selectedExpense.fieldValues}
                  onFieldValuesChange={(fieldValues) => updateExpense(selectedExpense.id!, { fieldValues })}
                  autoFilledFieldIds={autoFilledByExpense[selectedExpense.id!]}
                  onFieldTouched={(fieldId) => clearAutoFilled(selectedExpense.id!, fieldId)}
                />
              ) : null}

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Paid By</p>
                <div className="flex gap-4 text-sm">
                  {(
                    [
                      { value: "company" as const, label: "Company Paid" },
                      { value: "self" as const, label: "Self Paid" },
                    ] as const
                  ).map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`paid-by-${selectedExpense.id}`}
                        checked={selectedExpense.paidBy === option.value}
                        onChange={() => updateExpense(selectedExpense.id!, { paidBy: option.value })}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select an invoice to review its expense.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={() => router.push(ROUTES.CLAIMS)}>
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
      </div>
    </div>
  );
}

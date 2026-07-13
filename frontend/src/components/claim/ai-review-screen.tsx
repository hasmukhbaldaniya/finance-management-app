"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowsMergeIcon,
  ArrowsSplitIcon,
  CaretLeftIcon,
  FileIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import {
  checkExpenseDuplicate,
  getClaimDetail,
  getInvoiceFiles,
  getProcessingStatus,
  mergeInvoicePages,
  processInvoiceFiles,
  saveExpenses,
  unmergeInvoicePages,
  uploadInvoiceFiles,
} from "@/apis/claim";
import { getClaimableCategories } from "@/apis/category";
import { AiProcessingPipeline } from "@/components/claim/ai-processing-pipeline";
import { CategorySelect } from "@/components/claim/category-select";
import { DeleteInvoiceFileDialog } from "@/components/claim/delete-invoice-file-dialog";
import { ExpenseDynamicForm } from "@/components/claim/expense-dynamic-form";
import { SplitClaimDialog } from "@/components/claim/split-claim-dialog";
import { SplitExpenseDialog } from "@/components/claim/split-expense-dialog";
import { SplitWithColleaguesDialog } from "@/components/claim/split-with-colleagues-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getInvoiceFileContent } from "@/apis/claim/getInvoiceFileContent.api";
import { formatClaimName, formatInr } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { MAX_INVOICE_FILE_COUNT } from "@/utils/constants/claim.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimableCategory, ClaimInvoiceFile, DuplicateMatch, Expense } from "@/types/claim.type";
import type { LocalExpense } from "@/components/claim/local-expense.type";

const POLL_INTERVAL_MS = 1500;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

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

  const [claimName, setClaimName] = useState("");
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
  const [isUploadingMore, setIsUploadingMore] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ClaimInvoiceFile | null>(null);
  const [splitExpenseTarget, setSplitExpenseTarget] = useState<LocalExpense | null>(null);
  const [splitWithColleaguesTarget, setSplitWithColleaguesTarget] = useState<LocalExpense | null>(null);
  const [isSplitClaimOpen, setIsSplitClaimOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const addExpenseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getClaimableCategories()
      .then((response) => setCategories(response.categories))
      .catch(() => setCategories([]));
  }, []);

  // Shared by the initial mount's processing wait and by "Add Expense"'s
  // own upload-then-process cycle — both are "wait until every uploaded
  // source has resolved," just at different points in the claim's life.
  async function pollUntilComplete(isCancelledRef: { current: boolean }): Promise<void> {
    for (;;) {
      if (isCancelledRef.current) return;
      const status = await getProcessingStatus(claimId);
      if (isCancelledRef.current) return;
      setProcessingStatus(status);
      if (status.isComplete) return;
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  useEffect(() => {
    const isCancelledRef = { current: false };
    (async () => {
      try {
        await pollUntilComplete(isCancelledRef);
        if (isCancelledRef.current) return;
        await loadReviewData();
        if (!isCancelledRef.current) setIsProcessing(false);
      } catch (error) {
        if (!isCancelledRef.current) toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      }
    })();
    return () => {
      isCancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  // Returns the freshly-loaded expenses so callers (e.g. "Add Expense") can
  // tell which ones are brand new without a second round trip. Auto-filled
  // tracking is preserved for any expense id that already existed (so a
  // field the employee already edited on an older expense doesn't get its
  // "Auto-filled" badge wrongly restored) and freshly computed only for
  // ids that weren't there before — covers the initial load, Merge/Unmerge,
  // and adding another invoice, all in one place.
  async function loadReviewData(): Promise<LocalExpense[]> {
    const [{ claim }, { files }] = await Promise.all([getClaimDetail(claimId), getInvoiceFiles(claimId)]);
    const nextExpenses = claim.expenses.map(localExpenseFromDetail);
    setClaimName(formatClaimName(claim));
    setInvoiceFiles(files);

    setAutoFilledByExpense((previous) => {
      const next: Record<number, Set<number>> = {};
      nextExpenses.forEach((expense) => {
        const id = expense.id!;
        next[id] =
          previous[id] ??
          new Set(
            Object.entries(expense.fieldValues)
              .filter(([, value]) => value !== null && value !== undefined && value !== "")
              .map(([fieldId]) => Number(fieldId))
          );
      });
      return next;
    });

    setExpenses(nextExpenses);
    setSelectedExpenseId((previousSelected) =>
      nextExpenses.length > 0 && !nextExpenses.some((expense) => expense.id === previousSelected) ? nextExpenses[0]!.id! : previousSelected
    );

    const duplicates: Record<number, DuplicateMatch | null> = {};
    await Promise.all(
      nextExpenses.map(async (expense) => {
        if (!expense.id || expense.id < 0) return;
        try {
          const { duplicate } = await checkExpenseDuplicate(claimId, expense.id);
          duplicates[expense.id] = duplicate ? { ...duplicate, expenseId: expense.id } : null;
        } catch {
          duplicates[expense.id] = null;
        }
      })
    );
    setDuplicateByExpense(duplicates);

    return nextExpenses;
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

  // "Add Expense" in the AI-Powered flow means uploading one more bill and
  // letting it go through the exact same AI pipeline as Step 1's own
  // uploads — auto-categorized, fields auto-filled — not a blank manual
  // row. Existing invoice sources are left untouched (processInvoiceFiles
  // only ever processes sources that don't already have an AiExtractionLog).
  async function handleAddExpenseFiles(fileList: FileList | null): Promise<void> {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    if (invoiceFiles.length + files.length > MAX_INVOICE_FILE_COUNT) {
      toast.error(`You can upload up to ${MAX_INVOICE_FILE_COUNT} files.`);
      return;
    }

    const previousIds = new Set(expenses.map((expense) => expense.id));
    setIsUploadingMore(true);
    try {
      await uploadInvoiceFiles(claimId, files);
      await processInvoiceFiles(claimId);
      await pollUntilComplete({ current: false });
      const nextExpenses = await loadReviewData();
      const newExpense = nextExpenses.find((expense) => !previousIds.has(expense.id));
      if (newExpense) setSelectedExpenseId(newExpense.id!);
      toast.success(files.length > 1 ? "Invoices processed." : "Invoice processed.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsUploadingMore(false);
    }
  }

  // A split-off portion beyond the first has no invoice of its own (see
  // claim.controller.ts's splitExpense) — it's the one way a "manual,
  // no-file" expense still shows up in this flow. Never persisted as new
  // until the next save, so removing one locally is enough; the next Save
  // as Draft/Save Claim's full-replace semantics delete it server-side.
  function removeManualExpense(expenseId: number): void {
    setExpenses((previous) => previous.filter((expense) => expense.id !== expenseId));
    if (selectedExpenseId === expenseId) setSelectedExpenseId(null);
  }

  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId) ?? null;
  const selectedCategory = categories.find((category) => category.id === selectedExpense?.categoryId) ?? null;
  const selectedInvoiceFile = invoiceFiles.find((file) => file.id === selectedExpense?.sourceInvoiceFileId) ?? null;
  const totalAmount = expenses.reduce((total, expense) => total + Number(expense.amount ?? 0), 0);
  const manualExpenses = expenses.filter((expense) => !expense.sourceInvoiceFileId);

  // Fetched as an authenticated Blob and rendered via an object URL — not a
  // plain <img src="http://localhost:4000/...">, since whether a browser
  // attaches the session cookie to a cross-origin subresource request isn't
  // reliable across browsers/privacy settings (this is what actually broke
  // the preview: the endpoint itself was always fine, verified with curl).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    setZoom(1);
    if (!selectedInvoiceFile) {
      setPreviewUrl(null);
      return;
    }
    let isCancelled = false;
    let objectUrl: string | null = null;
    setIsPreviewLoading(true);
    getInvoiceFileContent(claimId, selectedInvoiceFile.id)
      .then((blob) => {
        if (isCancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!isCancelled) setPreviewUrl(null);
      })
      .finally(() => {
        if (!isCancelled) setIsPreviewLoading(false);
      });
    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, selectedInvoiceFile?.id]);

  async function handleMerge(fileId: number): Promise<void> {
    setIsMerging(true);
    try {
      const pageNumbers = expenses.filter((expense) => selectedForMerge.includes(expense.id!)).map((expense) => expense.sourcePageNumber!);
      await mergeInvoicePages(claimId, fileId, pageNumbers);
      toast.success("Pages merged.");
      setSelectedForMerge([]);
      await loadReviewData();
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
      await loadReviewData();
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
          id: expense.id && expense.id > 0 ? expense.id : undefined,
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
        await loadReviewData();
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

  const canSplitSelected = Boolean(selectedExpense?.id && selectedExpense.id > 0 && selectedExpense.categoryId !== null && Number(selectedExpense.amount ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Create Claim</h1>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">
            Claim Name: <span className="font-medium text-foreground">{claimName}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={addExpenseInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(event) => {
              void handleAddExpenseFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addExpenseInputRef.current?.click()}
            disabled={isUploadingMore || invoiceFiles.length >= MAX_INVOICE_FILE_COUNT}
          >
            {isUploadingMore ? <Spinner className="size-3.5" /> : <PlusIcon size={14} />} Add Expense
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsSplitClaimOpen(true)} disabled={expenses.length < 2}>
            <ArrowsSplitIcon size={14} /> Move to New Claim
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_1fr]">
        {/* Invoices column */}
        <div className="flex flex-col rounded-lg border border-border">
          <div className="border-b border-border p-3">
            <h2 className="text-sm font-semibold">Invoices</h2>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {invoiceFiles.map((file) => {
              const fileExpenses = expenses
                .filter((expense) => expense.sourceInvoiceFileId === file.id)
                .sort((a, b) => (a.sourcePageNumber ?? 0) - (b.sourcePageNumber ?? 0));
              const mergeableIds = fileExpenses.filter((expense) => file.fileType === "pdf" && expense.sourcePageNumber !== null).map((expense) => expense.id!);
              const canMerge = selectedForMerge.length >= 2 && selectedForMerge.every((id) => mergeableIds.includes(id));
              const isSingleRow = fileExpenses.length <= 1;
              const soleExpense = fileExpenses[0];

              return (
                <div key={file.id} className="space-y-1.5">
                  <div
                    onClick={isSingleRow && soleExpense ? () => setSelectedExpenseId(soleExpense.id!) : undefined}
                    className={`relative space-y-1 rounded-md border p-2 text-xs ${isSingleRow ? "cursor-pointer" : ""} ${
                      isSingleRow && soleExpense && selectedExpenseId === soleExpense.id ? "border-primary bg-primary/5" : "border-border"
                    } ${soleExpense?.isRedFlagged ? "border-red-400" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <FileIcon size={16} className="text-muted-foreground" />
                        <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">{file.fileType}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.originalFileName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setFileToDelete(file);
                        }}
                        className="flex size-6 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <TrashIcon size={12} />
                      </button>
                    </div>
                    <p className="truncate font-medium">{file.originalFileName}</p>
                    <p className="text-muted-foreground">Total Expenses: {fileExpenses.length}</p>
                  </div>

                  {!isSingleRow ? (
                    <>
                      <div className="flex items-center justify-end gap-2 px-1">
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
                    </>
                  ) : null}
                </div>
              );
            })}

            {isUploadingMore ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
                <Spinner className="size-3.5 shrink-0" />
                Reading your new invoice…
              </div>
            ) : null}

            {manualExpenses.length > 0 ? (
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Other Expenses</p>
                {manualExpenses.map((expense) => (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => setSelectedExpenseId(expense.id!)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-xs ${
                      selectedExpenseId === expense.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{categories.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized"}</span>
                    <span
                      role="button"
                      aria-label="Remove expense"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeManualExpense(expense.id!);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon size={12} />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-1 border-t border-border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Expenses :</span>
              <span className="font-semibold">{expenses.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Amount :</span>
              <span className="font-semibold">₹{formatInr(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className="flex flex-col rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2 border-b border-border p-3">
            <p className="truncate text-sm font-medium">{selectedInvoiceFile?.originalFileName ?? "Preview"}</p>
            {selectedInvoiceFile ? <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">AI-Processed</span> : null}
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-3">
            {!selectedInvoiceFile ? (
              <p className="text-sm text-muted-foreground">Select an invoice to preview.</p>
            ) : isPreviewLoading || !previewUrl ? (
              <div className="flex h-[50vh] w-full items-center justify-center">
                {isPreviewLoading ? <Spinner className="size-6" /> : <p className="text-sm text-muted-foreground">Couldn&apos;t load the preview.</p>}
              </div>
            ) : selectedInvoiceFile.fileType === "pdf" ? (
              <iframe title="Invoice preview" src={previewUrl} className="h-[50vh] w-full rounded-md border border-border" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={selectedInvoiceFile.originalFileName}
                style={{ width: `${zoom * 100}%` }}
                className="max-h-[50vh] rounded-md border border-border object-contain"
              />
            )}
          </div>
          {selectedInvoiceFile && selectedInvoiceFile.fileType !== "pdf" ? (
            <div className="flex items-center justify-center gap-3 border-t border-border p-2">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((previous) => Math.max(MIN_ZOOM, previous - ZOOM_STEP))}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <MagnifyingGlassMinusIcon size={16} />
              </button>
              <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((previous) => Math.min(MAX_ZOOM, previous + ZOOM_STEP))}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <MagnifyingGlassPlusIcon size={16} />
              </button>
            </div>
          ) : null}
          <div className="flex justify-center gap-2 border-t border-border p-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => selectedExpense && setSplitExpenseTarget(selectedExpense)} disabled={!canSplitSelected}>
              <ArrowsSplitIcon size={14} /> Split Expense
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => selectedExpense && setSplitWithColleaguesTarget(selectedExpense)} disabled={!canSplitSelected}>
              Split with Colleagues
            </Button>
          </div>
        </div>

        {/* Expense Form column */}
        <div className="flex flex-col rounded-lg border border-border">
          <div className="border-b border-border p-3">
            <h2 className="text-sm font-semibold">Expense Form</h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={() => router.push(ROUTES.CLAIM_NEW_AI)}>
          <CaretLeftIcon size={14} /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-3">
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

      <DeleteInvoiceFileDialog
        claimId={claimId}
        file={fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        onDeleted={() => loadReviewData()}
      />
      <SplitExpenseDialog
        claimId={claimId}
        expense={splitExpenseTarget}
        categories={categories}
        onOpenChange={(open) => !open && setSplitExpenseTarget(null)}
        onSplit={() => loadReviewData()}
      />
      <SplitClaimDialog claimId={claimId} expenses={expenses} categories={categories} open={isSplitClaimOpen} onOpenChange={setIsSplitClaimOpen} />
      <SplitWithColleaguesDialog
        claimId={claimId}
        expense={splitWithColleaguesTarget}
        onOpenChange={(open) => !open && setSplitWithColleaguesTarget(null)}
        onSplit={() => setSplitWithColleaguesTarget(null)}
      />
    </div>
  );
}

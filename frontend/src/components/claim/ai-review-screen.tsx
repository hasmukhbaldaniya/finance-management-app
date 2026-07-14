"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import { statusTones } from "@/theme/colors";
import { toast } from "@/components/ui/toast";
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
import { isExpenseComplete } from "@/components/claim/expense-completeness";
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
  const [isSplitClaimOpen, setIsSplitClaimOpen] = useState(false);
  const [isPersistingForSplit, setIsPersistingForSplit] = useState(false);
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

  // The backend's own split-request gate checks the persisted Expense row's
  // amount/category (split-request.controller.ts), not the live fieldValues
  // this screen edits in memory — so even an expense that already has a real
  // id can be stale if its fields were edited since the last save. Always
  // silently re-save as a draft immediately before opening either split
  // dialog, the same "ensure persisted" pattern claim-manual-form.tsx uses.
  async function persistDraftSilently(): Promise<LocalExpense[] | null> {
    await saveExpenses(claimId, {
      isDraftSave: true,
      expenses: expenses.map((expense) => ({
        id: expense.id && expense.id > 0 ? expense.id : undefined,
        categoryId: expense.categoryId ?? 0,
        paidBy: expense.paidBy ?? "self",
        fieldValues: expense.fieldValues,
      })),
    });
    return loadReviewData();
  }

  async function handleOpenSplitExpense(): Promise<void> {
    if (!selectedExpense) return;
    const targetId = selectedExpense.id;
    setIsPersistingForSplit(true);
    try {
      const freshExpenses = await persistDraftSilently();
      const freshTarget = freshExpenses?.find((expense) => expense.id === targetId);
      if (freshTarget) setSplitExpenseTarget(freshTarget);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsPersistingForSplit(false);
    }
  }

  async function handleOpenSplitClaim(): Promise<void> {
    setIsPersistingForSplit(true);
    try {
      const freshExpenses = await persistDraftSilently();
      if (freshExpenses) setIsSplitClaimOpen(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsPersistingForSplit(false);
    }
  }

  if (isProcessing) {
    return <AiProcessingPipeline status={processingStatus} />;
  }

  const canSplitSelected = selectedExpense !== null && isExpenseComplete(selectedExpense, selectedCategory);
  const canSplitClaim =
    expenses.length > 0 && expenses.every((expense) => isExpenseComplete(expense, categories.find((category) => category.id === expense.categoryId) ?? null));

  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
            Create Claim
          </Typography>
          <Typography color="text.secondary">|</Typography>
          <Typography variant="body2" color="text.secondary">
            Claim Name:{" "}
            <Typography component="span" color="text.primary" sx={{ fontWeight: 500 }}>
              {claimName}
            </Typography>
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            component="input"
            ref={addExpenseInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            sx={{ display: "none" }}
            onChange={(event) => {
              void handleAddExpenseFiles((event.target as HTMLInputElement).files);
              (event.target as HTMLInputElement).value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addExpenseInputRef.current?.click()}
            disabled={isUploadingMore || invoiceFiles.length >= MAX_INVOICE_FILE_COUNT}
          >
            {isUploadingMore ? <Spinner size={14} /> : <PlusIcon size={14} />} Add Expense
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleOpenSplitClaim} disabled={!canSplitClaim || isPersistingForSplit}>
            {isPersistingForSplit ? <Spinner size={14} /> : <ArrowsSplitIcon size={14} />} Split Claim
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "280px 1fr 1fr" }, gap: 2 }}>
        {/* Invoices column */}
        <Stack sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Invoices
            </Typography>
          </Box>
          <Stack spacing={1.5} sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
            {invoiceFiles.map((file) => {
              const fileExpenses = expenses
                .filter((expense) => expense.sourceInvoiceFileId === file.id)
                .sort((a, b) => (a.sourcePageNumber ?? 0) - (b.sourcePageNumber ?? 0));
              const mergeableIds = fileExpenses.filter((expense) => file.fileType === "pdf" && expense.sourcePageNumber !== null).map((expense) => expense.id!);
              const canMerge = selectedForMerge.length >= 2 && selectedForMerge.every((id) => mergeableIds.includes(id));
              const isSingleRow = fileExpenses.length <= 1;
              const soleExpense = fileExpenses[0];
              const isSoleSelected = isSingleRow && soleExpense && selectedExpenseId === soleExpense.id;

              return (
                <Stack spacing={0.75} key={file.id}>
                  <Stack
                    spacing={0.5}
                    onClick={isSingleRow && soleExpense ? () => setSelectedExpenseId(soleExpense.id!) : undefined}
                    sx={{
                      position: "relative",
                      borderRadius: 1.5,
                      border: 1,
                      p: 1,
                      fontSize: "0.75rem",
                      cursor: isSingleRow ? "pointer" : "default",
                      borderColor: soleExpense?.isRedFlagged ? "#f87171" : isSoleSelected ? "primary.main" : "divider",
                      bgcolor: isSoleSelected ? (theme) => alpha(theme.palette.primary.main, 0.05) : "transparent",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                        <Box sx={{ color: "text.secondary", display: "flex" }}>
                          <FileIcon size={16} />
                        </Box>
                        <Box sx={{ borderRadius: 0.5, bgcolor: "action.hover", px: 0.5, py: 0.25, fontSize: "9px", fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>
                          {file.fileType}
                        </Box>
                      </Stack>
                      <Box
                        component="button"
                        type="button"
                        aria-label={`Remove ${file.originalFileName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setFileToDelete(file);
                        }}
                        sx={{
                          display: "flex",
                          width: 24,
                          height: 24,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          bgcolor: statusTones.rejected.background,
                          color: statusTones.rejected.text,
                          border: "none",
                          cursor: "pointer",
                          "&:hover": { opacity: 0.8 },
                        }}
                      >
                        <TrashIcon size={12} />
                      </Box>
                    </Stack>
                    <Typography variant="caption" noWrap sx={{ fontWeight: 500, display: "block" }}>
                      {file.originalFileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Total Expenses: {fileExpenses.length}
                    </Typography>
                  </Stack>

                  {!isSingleRow ? (
                    <>
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", px: 0.5 }}>
                        {canMerge ? (
                          <Box
                            component="button"
                            type="button"
                            onClick={() => handleMerge(file.id)}
                            disabled={isMerging}
                            sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.75rem", fontWeight: 500, color: "primary.main", background: "none", border: "none", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                          >
                            <ArrowsMergeIcon size={12} /> Merge
                          </Box>
                        ) : null}
                      </Stack>
                      {fileExpenses.map((expense) => {
                        const isMergedRow = Array.isArray(expense.mergedFromExpenseIds) && expense.mergedFromExpenseIds.length > 0;
                        const canCheckMerge = file.fileType === "pdf" && expense.sourcePageNumber !== null;
                        const isSelected = selectedExpenseId === expense.id;
                        return (
                          <Stack
                            component="button"
                            direction="row"
                            type="button"
                            key={expense.id}
                            spacing={1}
                            onClick={() => setSelectedExpenseId(expense.id!)}
                            sx={{
                              width: "100%",
                              alignItems: "center",
                              borderRadius: 1.5,
                              border: 1,
                              borderColor: expense.isRedFlagged ? "#f87171" : isSelected ? "primary.main" : "divider",
                              bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, 0.05) : "transparent",
                              p: 1,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              background: isSelected ? undefined : "none",
                              cursor: "pointer",
                            }}
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
                            <Typography variant="caption" noWrap sx={{ minWidth: 0, flex: 1 }}>
                              {categories.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized"}
                              {expense.sourcePageNumber ? ` — Page ${expense.sourcePageNumber}` : ""}
                            </Typography>
                            {expense.isRedFlagged ? (
                              <Box sx={{ flexShrink: 0, color: "error.main", display: "flex" }}>
                                <WarningCircleIcon size={14} />
                              </Box>
                            ) : null}
                            {isMergedRow ? (
                              <Box
                                component="span"
                                role="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUnmerge(expense.id!);
                                }}
                                title="Unmerge"
                                sx={{ flexShrink: 0, color: "text.secondary", display: "flex", "&:hover": { color: "text.primary" } }}
                              >
                                <ArrowsSplitIcon size={14} />
                              </Box>
                            ) : null}
                          </Stack>
                        );
                      })}
                    </>
                  ) : null}
                </Stack>
              );
            })}

            {isUploadingMore ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderRadius: 1.5, border: 1, borderStyle: "dashed", borderColor: "divider", p: 1, fontSize: "0.75rem", color: "text.secondary" }}>
                <Box sx={{ flexShrink: 0, display: "flex" }}>
                  <Spinner size={14} />
                </Box>
                Reading your new invoice…
              </Stack>
            ) : null}

            {manualExpenses.length > 0 ? (
              <Stack spacing={0.75} sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Other Expenses
                </Typography>
                {manualExpenses.map((expense) => {
                  const isSelected = selectedExpenseId === expense.id;
                  return (
                    <Stack
                      component="button"
                      direction="row"
                      type="button"
                      key={expense.id}
                      spacing={1}
                      onClick={() => setSelectedExpenseId(expense.id!)}
                      sx={{
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: 1.5,
                        border: 1,
                        borderColor: isSelected ? "primary.main" : "divider",
                        bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, 0.05) : "transparent",
                        p: 1,
                        textAlign: "left",
                        fontSize: "0.75rem",
                        background: isSelected ? undefined : "none",
                        cursor: "pointer",
                      }}
                    >
                      <Typography variant="caption" noWrap sx={{ minWidth: 0, flex: 1 }}>
                        {categories.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized"}
                      </Typography>
                      <Box
                        component="span"
                        role="button"
                        aria-label="Remove expense"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeManualExpense(expense.id!);
                        }}
                        sx={{ color: "text.secondary", display: "flex", "&:hover": { color: "error.main" } }}
                      >
                        <TrashIcon size={12} />
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            ) : null}
          </Stack>
          <Stack spacing={0.5} sx={{ borderTop: 1, borderColor: "divider", p: 1.5, fontSize: "0.875rem" }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Total Expenses :
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {expenses.length}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Total Amount :
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ₹{formatInr(totalAmount)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        {/* Preview column */}
        <Stack sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "action.hover" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", p: 1.5 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {selectedInvoiceFile?.originalFileName ?? "Preview"}
            </Typography>
            {selectedInvoiceFile ? (
              <Chip label="AI-Processed" size="small" sx={{ flexShrink: 0, fontWeight: 500, bgcolor: statusTones.accepted.background, color: statusTones.accepted.text }} />
            ) : null}
          </Stack>
          <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center", overflow: "auto", p: 1.5 }}>
            {!selectedInvoiceFile ? (
              <Typography variant="body2" color="text.secondary">
                Select an invoice to preview.
              </Typography>
            ) : isPreviewLoading || !previewUrl ? (
              <Box sx={{ display: "flex", height: "50vh", width: "100%", alignItems: "center", justifyContent: "center" }}>
                {isPreviewLoading ? (
                  <Spinner size={24} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Couldn&apos;t load the preview.
                  </Typography>
                )}
              </Box>
            ) : selectedInvoiceFile.fileType === "pdf" ? (
              <Box component="iframe" title="Invoice preview" src={previewUrl} sx={{ height: "50vh", width: "100%", borderRadius: 1.5, border: 1, borderColor: "divider" }} />
            ) : (
              <Box
                component="img"
                src={previewUrl}
                alt={selectedInvoiceFile.originalFileName}
                sx={{ width: `${zoom * 100}%`, maxHeight: "50vh", borderRadius: 1.5, border: 1, borderColor: "divider", objectFit: "contain" }}
              />
            )}
          </Stack>
          {selectedInvoiceFile && selectedInvoiceFile.fileType !== "pdf" ? (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", borderTop: 1, borderColor: "divider", p: 1 }}>
              <Box
                component="button"
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((previous) => Math.max(MIN_ZOOM, previous - ZOOM_STEP))}
                sx={{ display: "flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 1.5, color: "text.secondary", background: "none", border: "none", cursor: "pointer", "&:hover": { bgcolor: "action.selected" } }}
              >
                <MagnifyingGlassMinusIcon size={16} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: "center" }}>
                {Math.round(zoom * 100)}%
              </Typography>
              <Box
                component="button"
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((previous) => Math.min(MAX_ZOOM, previous + ZOOM_STEP))}
                sx={{ display: "flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 1.5, color: "text.secondary", background: "none", border: "none", cursor: "pointer", "&:hover": { bgcolor: "action.selected" } }}
              >
                <MagnifyingGlassPlusIcon size={16} />
              </Box>
            </Stack>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ justifyContent: "center", borderTop: 1, borderColor: "divider", p: 1 }}>
            <Button type="button" variant="secondary" size="sm" onClick={handleOpenSplitExpense} disabled={!canSplitSelected || isPersistingForSplit}>
              {isPersistingForSplit ? <Spinner size={14} /> : <ArrowsSplitIcon size={14} />} Split Expense
            </Button>
          </Stack>
        </Stack>

        {/* Expense Form column */}
        <Stack sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Expense Form
            </Typography>
          </Box>
          <Stack spacing={2} sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {selectedExpense ? (
              <>
                {duplicateByExpense[selectedExpense.id!] ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", borderRadius: 1.5, bgcolor: statusTones.pending.background, color: statusTones.pending.text, p: 1.5, fontSize: "0.75rem" }}>
                    <Box sx={{ mt: 0.25, flexShrink: 0, display: "flex" }}>
                      <WarningCircleIcon size={16} />
                    </Box>
                    <Box component="span">
                      This looks like a bill you&apos;ve already claimed — {duplicateByExpense[selectedExpense.id!]!.claimantName}&apos;s claim on{" "}
                      {duplicateByExpense[selectedExpense.id!]!.expenseDate ?? "an earlier date"} has the same details.
                    </Box>
                  </Stack>
                ) : null}

                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Category
                  </Typography>
                  <CategorySelect
                    categories={categories}
                    value={selectedExpense.categoryId}
                    onChange={(categoryId) => updateExpense(selectedExpense.id!, { categoryId, fieldValues: {} })}
                  />
                </Stack>

                {selectedCategory ? (
                  <ExpenseDynamicForm
                    fields={selectedCategory.fields}
                    fieldValues={selectedExpense.fieldValues}
                    onFieldValuesChange={(fieldValues) => updateExpense(selectedExpense.id!, { fieldValues })}
                    autoFilledFieldIds={autoFilledByExpense[selectedExpense.id!]}
                    onFieldTouched={(fieldId) => clearAutoFilled(selectedExpense.id!, fieldId)}
                  />
                ) : null}

                <Stack spacing={1} sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Paid By
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
                    {(
                      [
                        { value: "company" as const, label: "Company Paid" },
                        { value: "self" as const, label: "Self Paid" },
                      ] as const
                    ).map((option) => (
                      <Box component="label" key={option.value} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <input
                          type="radio"
                          name={`paid-by-${selectedExpense.id}`}
                          checked={selectedExpense.paidBy === option.value}
                          onChange={() => updateExpense(selectedExpense.id!, { paidBy: option.value })}
                        />
                        {option.label}
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select an invoice to review its expense.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", borderTop: 1, borderColor: "divider", pt: 3 }}>
        <Button type="button" variant="outline" onClick={() => router.push(ROUTES.CLAIM_NEW_AI)}>
          <CaretLeftIcon size={14} /> Back
        </Button>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
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
        </Stack>
      </Stack>

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
      <SplitClaimDialog
        claimId={claimId}
        expenses={expenses}
        categories={categories}
        open={isSplitClaimOpen}
        onOpenChange={setIsSplitClaimOpen}
        onSplit={() => loadReviewData()}
      />
    </Stack>
  );
}

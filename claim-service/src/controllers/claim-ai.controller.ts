import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer, { MulterError } from "multer";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Category, CategoryField, Claim, ClaimInvoiceFile, Expense } from "../models";
import { extractInvoiceData, listExtractionLogs, type CategoryForExtraction } from "../services/ai-extraction.service";
import {
  ALLOWED_INVOICE_FILE_EXTENSIONS,
  MAX_INVOICE_FILE_COUNT,
  MAX_INVOICE_FILE_SIZE_MB,
} from "../utils/constants/claim.constant";
import { findDuplicateExpense } from "../utils/duplicate-expense-check";
import { validateExpenseFieldValues } from "../utils/expense-fields";
import { deleteInvoiceFile, readInvoiceFile, saveInvoiceFile } from "../utils/invoice-file-storage";
import { extractPdfPages, getPdfPageCount } from "../utils/pdf-pages";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CLAIM_NOT_FOUND_MESSAGE = "Claim not found.";

const EXTENSION_TO_MEDIA_TYPE: Record<string, "application/pdf" | "image/jpeg" | "image/png"> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

// ---- multer (multipart file) setup — mirrors employee-bulk-invite's own
// pattern (memoryStorage, a fileFilter, a wrapper translating multer's own
// next(err) callback into this codebase's { error } JSON shape). ----

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_INVOICE_FILE_SIZE_MB * 1024 * 1024, files: MAX_INVOICE_FILE_COUNT },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_INVOICE_FILE_EXTENSIONS.includes(extension as (typeof ALLOWED_INVOICE_FILE_EXTENSIONS)[number])) {
      callback(new Error("UNSUPPORTED_TYPE"));
      return;
    }
    callback(null, true);
  },
});

export function invoiceUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  const handler: RequestHandler = multerUpload.array("files", MAX_INVOICE_FILE_COUNT);
  handler(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: `Each file must be ${MAX_INVOICE_FILE_SIZE_MB}MB or smaller.` });
      return;
    }
    if (err instanceof MulterError && err.code === "LIMIT_FILE_COUNT") {
      res.status(400).json({ error: `You can upload up to ${MAX_INVOICE_FILE_COUNT} files.` });
      return;
    }
    res.status(400).json({ error: "Only PDF, JPG, JPEG, and PNG files are supported." });
  });
}

async function loadOwnedDraftClaim(claimId: number, employeeId: number): Promise<Claim | null> {
  const claim = await Claim.findOne({ where: { id: claimId, employeeId } });
  if (!claim || claim.status !== "draft") return null;
  return claim;
}

// The Review screen's "Invoices" left column needs every uploaded file
// regardless of whether its pages have resolved into an Expense yet (a
// still-processing source has no Expense at all) — Expense rows alone can't
// answer "what's still in flight," so this is its own small listing.
export async function listInvoiceFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const files = await ClaimInvoiceFile.findAll({ where: { claimId: claim.id }, order: [["uploadedAt", "ASC"]] });
  res.status(200).json({
    files: files.map((file) => ({ id: file.id, originalFileName: file.originalFileName, fileType: file.fileType, pageCount: file.pageCount })),
  });
}

// 023's Upload Invoices story — each uploaded image is one invoice source;
// each PDF page is its own source too, but shown as one file row noting its
// page count at this step (source-level fan-out happens at processing time).
export async function uploadInvoiceFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await loadOwnedDraftClaim(Number(req.params.id), req.userId);
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  if (files.length === 0) {
    res.status(400).json({ error: "Upload at least one invoice." });
    return;
  }

  const existingCount = await ClaimInvoiceFile.count({ where: { claimId: claim.id } });
  if (existingCount + files.length > MAX_INVOICE_FILE_COUNT) {
    res.status(400).json({ error: `You can upload up to ${MAX_INVOICE_FILE_COUNT} files.` });
    return;
  }

  // 023's own Edge Cases: a corrupted/password-protected PDF is "flagged
  // with an error... doesn't block the rest of the batch" — each file gets
  // its own try/catch so one bad file can't 500 the whole upload and lose
  // every other file in it.
  const created: ClaimInvoiceFile[] = [];
  const failed: { originalFileName: string }[] = [];
  for (const file of files) {
    try {
      const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
      const storedPath = await saveInvoiceFile(claim.id, file.buffer, file.originalname);
      const pageCount = extension === "pdf" ? await getPdfPageCount(file.buffer) : null;

      created.push(
        await ClaimInvoiceFile.create({
          claimId: claim.id,
          originalFileName: file.originalname,
          storedPath,
          fileType: extension as ClaimInvoiceFile["fileType"],
          fileSizeBytes: file.size,
          pageCount,
        })
      );
    } catch {
      failed.push({ originalFileName: file.originalname });
    }
  }

  res.status(201).json({
    files: created.map((file) => ({ id: file.id, originalFileName: file.originalFileName, fileType: file.fileType, pageCount: file.pageCount })),
    failed,
  });
}

// Removing an uploaded invoice (Step 1 or Step 2) takes its derived
// Expense(s) with it — onDelete: SET NULL on Expense.sourceInvoiceFileId
// would otherwise leave an orphaned expense with a dangling category/
// fieldValues, so those are destroyed explicitly first.
export async function removeInvoiceFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await loadOwnedDraftClaim(Number(req.params.id), req.userId);
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const invoiceFile = await ClaimInvoiceFile.findOne({ where: { id: Number(req.params.fileId), claimId: claim.id } });
  if (!invoiceFile) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  await Expense.destroy({ where: { claimId: claim.id, sourceInvoiceFileId: invoiceFile.id } });
  await deleteInvoiceFile(invoiceFile.storedPath);
  await invoiceFile.destroy();

  const expenses = await Expense.findAll({ where: { claimId: claim.id } });
  claim.totalAmount = expenses.reduce((total, expense) => total + Number(expense.amount), 0).toFixed(2);
  await claim.save();

  res.status(200).json({ message: "Invoice removed." });
}

async function loadCategoriesForExtraction(organizationId: number): Promise<CategoryForExtraction[]> {
  const categories = await Category.findAll({ where: { organizationId, status: "active", isEnabled: true } });
  const fields = await CategoryField.findAll({ where: { categoryId: categories.map((category) => category.id) } });
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    fields: fields.filter((field) => field.categoryId === category.id),
  }));
}

// One invoice source (an image file, or a single/merged set of PDF pages)
// run through the AI/ML service end to end, then create the resulting
// Expense — blank if extraction failed or returned nothing usable, per
// 023's own "source still reaches Review, blank" rule. ai-service now
// writes its own AiExtractionLog row around its own /api/extract call (see
// docs/PLANS/microservices-plan.md's Phase 4) — this function no longer
// creates or updates one itself, just passes the correlation keys
// (claimInvoiceFileId/pageNumber) that let it do so.
async function runSourceExtraction(params: {
  claim: Claim;
  invoiceFile: ClaimInvoiceFile;
  pageNumbers: number[] | null;
  categories: CategoryForExtraction[];
  position: number;
}): Promise<void> {
  const { claim, invoiceFile, pageNumbers, categories, position } = params;

  let categoryId: number | null = null;
  let fieldValues: Record<string, unknown> = {};
  let redFlagged = false;
  let redFlagReason: string | null = null;

  try {
    const fileBuffer = await readInvoiceFile(invoiceFile.storedPath);
    const mediaType = EXTENSION_TO_MEDIA_TYPE[invoiceFile.fileType];
    const documentBuffer = invoiceFile.fileType === "pdf" && pageNumbers ? await extractPdfPages(fileBuffer, pageNumbers) : fileBuffer;

    const result = await extractInvoiceData({
      documentBase64: documentBuffer.toString("base64"),
      mediaType,
      categories,
      claimInvoiceFileId: invoiceFile.id,
      pageNumber: pageNumbers ? pageNumbers[0] : null,
    });

    if (!("error" in result)) {
      categoryId = result.suggestedCategoryId;

      if (categoryId) {
        const fields = categories.find((category) => category.id === categoryId)?.fields ?? [];
        const validation = await validateExpenseFieldValues(fields as unknown as CategoryField[], result.extractedFields, true);
        if (!("error" in validation)) fieldValues = validation.normalizedValues;
      }

      const triggeredFlags = result.redFlags.filter((flag) => flag.triggered);
      redFlagged = triggeredFlags.length > 0;
      redFlagReason = triggeredFlags.length > 0 ? triggeredFlags.map((flag) => flag.reason).join(" ") : null;
    }
  } catch (err) {
    console.error(`AI extraction failed for claim invoice file ${invoiceFile.id}:`, err);
  }

  const fields = categoryId ? (categories.find((category) => category.id === categoryId)?.fields as unknown as CategoryField[]) ?? [] : [];
  const validation = await validateExpenseFieldValues(fields, fieldValues, true);
  const derived = "error" in validation ? { amount: "0.00", expenseDate: null, invoiceNumber: null, normalizedValues: fieldValues } : validation;

  await Expense.create({
    claimId: claim.id,
    organizationId: claim.organizationId,
    categoryId,
    position,
    paidBy: "self",
    fieldValues: derived.normalizedValues,
    amount: derived.amount,
    expenseDate: derived.expenseDate,
    invoiceNumber: derived.invoiceNumber,
    splitFromExpenseId: null,
    sourceInvoiceFileId: invoiceFile.id,
    sourcePageNumber: pageNumbers && pageNumbers.length === 1 ? pageNumbers[0] : null,
    mergedFromExpenseIds: pageNumbers && pageNumbers.length > 1 ? pageNumbers : null,
    isRedFlagged: redFlagged,
    redFlagReason,
  });
}

// Kicked off, not awaited, by processInvoiceFiles — this codebase has no
// queue/background-worker infrastructure anywhere yet (the same accepted
// single-process limitation employee-bulk-invite's own in-memory Map
// already documents), so "start async work, poll for status" is the
// simplest thing that satisfies 023's own visible multi-source pipeline.
async function runExtractionForClaim(claimId: number): Promise<void> {
  const claim = await Claim.findByPk(claimId);
  if (!claim) return;

  const invoiceFiles = await ClaimInvoiceFile.findAll({ where: { claimId } });
  const alreadyLogged = await listExtractionLogs(invoiceFiles.map((file) => file.id));
  const loggedFileIds = new Set(alreadyLogged.map((log) => log.claimInvoiceFileId));

  const categories = await loadCategoriesForExtraction(claim.organizationId);
  let position = await Expense.count({ where: { claimId } });

  for (const file of invoiceFiles) {
    if (loggedFileIds.has(file.id)) continue;
    const pageCount = file.pageCount ?? 1;
    for (let page = 1; page <= pageCount; page++) {
      const pageNumbers = file.fileType === "pdf" ? [page] : null;
      try {
        await runSourceExtraction({ claim, invoiceFile: file, pageNumbers, categories, position });
        position += 1;
      } catch (err) {
        console.error(`AI extraction failed for claim invoice file ${file.id}, page ${page}:`, err);
      }
    }
  }
}

export async function processInvoiceFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await loadOwnedDraftClaim(Number(req.params.id), req.userId);
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const invoiceFileCount = await ClaimInvoiceFile.count({ where: { claimId: claim.id } });
  if (invoiceFileCount === 0) {
    res.status(400).json({ error: "Upload at least one invoice." });
    return;
  }

  void runExtractionForClaim(claim.id).catch((err) => console.error(`AI processing pipeline failed for claim ${claim.id}:`, err));

  res.status(202).json({ message: "Processing started." });
}

// Polled by the 4-stage progress screen — reports every source's status and
// the running "Total Expenses"/"Total Amount" figures as they resolve.
export async function getProcessingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const invoiceFiles = await ClaimInvoiceFile.findAll({ where: { claimId: claim.id } });
  const logs = await listExtractionLogs(invoiceFiles.map((file) => file.id));
  const expenses = await Expense.findAll({ where: { claimId: claim.id } });

  const totalSources = invoiceFiles.reduce((total, file) => total + (file.pageCount ?? 1), 0);
  const totalAmount = expenses.reduce((total, expense) => total + Number(expense.amount), 0);

  res.status(200).json({
    isComplete: logs.length >= totalSources && logs.every((log) => log.status !== "pending"),
    totalSources,
    resolvedSources: logs.filter((log) => log.status !== "pending").length,
    totalExpenses: expenses.length,
    totalAmount: totalAmount.toFixed(2),
  });
}

// 023's Merge Invoice Pages — only offered across pages from the same
// uploaded PDF; re-runs extraction treating the selected pages as one
// combined document rather than summing independently-extracted fields.
export async function mergeInvoicePages(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await loadOwnedDraftClaim(Number(req.params.id), req.userId);
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const invoiceFile = await ClaimInvoiceFile.findOne({ where: { id: Number(req.params.fileId), claimId: claim.id } });
  if (!invoiceFile || invoiceFile.fileType !== "pdf") {
    res.status(400).json({ error: "Only pages from the same uploaded file can be merged." });
    return;
  }

  const pageNumbers = Array.isArray(req.body?.pageNumbers) ? (req.body.pageNumbers as unknown[]).map(Number).filter(Number.isFinite).sort((a, b) => a - b) : [];
  if (pageNumbers.length < 2) {
    res.status(400).json({ error: "Select at least two pages to merge." });
    return;
  }

  const originals = await Expense.findAll({
    where: { claimId: claim.id, sourceInvoiceFileId: invoiceFile.id, sourcePageNumber: pageNumbers },
  });
  if (originals.length !== pageNumbers.length) {
    res.status(400).json({ error: "Couldn't merge these pages — please try again or fill them in manually." });
    return;
  }

  const categories = await loadCategoriesForExtraction(claim.organizationId);
  const position = Math.min(...originals.map((expense) => expense.position));

  try {
    await runSourceExtraction({ claim, invoiceFile, pageNumbers, categories, position });
  } catch {
    res.status(500).json({ error: "Couldn't merge these pages — please try again or fill them in manually." });
    return;
  }

  await Expense.destroy({ where: { id: originals.map((expense) => expense.id) } });

  const expenses = await Expense.findAll({ where: { claimId: claim.id } });
  claim.totalAmount = expenses.reduce((total, expense) => total + Number(expense.amount), 0).toFixed(2);
  await claim.save();

  res.status(200).json({ message: "Pages merged." });
}

// 023's Unmerge — splits a previously-merged expense back into one expense
// per original page, each re-extracted independently, the same as if it had
// never been merged (not a restore of cached pre-merge values).
export async function unmergeInvoicePages(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await loadOwnedDraftClaim(Number(req.params.id), req.userId);
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const expense = await Expense.findOne({ where: { id: Number(req.params.expenseId), claimId: claim.id } });
  if (!expense || !expense.mergedFromExpenseIds || !expense.sourceInvoiceFileId) {
    res.status(400).json({ error: "This expense wasn't created by merging pages." });
    return;
  }

  const invoiceFile = await ClaimInvoiceFile.findByPk(expense.sourceInvoiceFileId);
  if (!invoiceFile) {
    res.status(404).json({ error: "Couldn't find the original uploaded file." });
    return;
  }

  const categories = await loadCategoriesForExtraction(claim.organizationId);
  const pageNumbers = expense.mergedFromExpenseIds;
  const position = expense.position;
  await expense.destroy();

  for (const pageNumber of pageNumbers) {
    await runSourceExtraction({ claim, invoiceFile, pageNumbers: [pageNumber], categories, position });
  }

  const expenses = await Expense.findAll({ where: { claimId: claim.id } });
  claim.totalAmount = expenses.reduce((total, row) => total + Number(row.amount), 0).toFixed(2);
  await claim.save();

  res.status(200).json({ message: "Pages unmerged." });
}

// Authenticated file serving for the "Preview Invoices" middle column —
// bills carry real financial/PII data, so this is never a public static
// path (see invoice-file-storage.ts).
export async function getInvoiceFileContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const invoiceFile = await ClaimInvoiceFile.findOne({ where: { id: Number(req.params.fileId), claimId: claim.id } });
  if (!invoiceFile) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  const buffer = await readInvoiceFile(invoiceFile.storedPath);
  res.setHeader("Content-Type", EXTENSION_TO_MEDIA_TYPE[invoiceFile.fileType] ?? "application/octet-stream");
  res.send(buffer);
}

// Also exposed for duplicate-check re-runs triggered from the Review screen
// (023's own Duplicate Bill Detection: "runs... at Review... and again at
// final Save Claim").
export async function checkExpenseDuplicate(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const expense = await Expense.findOne({ where: { id: Number(req.params.expenseId), claimId: claim.id } });
  if (!expense) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }

  const duplicate = await findDuplicateExpense({
    organizationId: claim.organizationId,
    invoiceNumber: expense.invoiceNumber,
    expenseDate: expense.expenseDate,
    amount: expense.amount,
    excludeExpenseId: expense.id,
  });

  res.status(200).json({ duplicate });
}

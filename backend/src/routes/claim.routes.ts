import { Router } from "express";
import {
  checkExpenseDuplicate,
  getInvoiceFileContent,
  getProcessingStatus,
  invoiceUploadMiddleware,
  listInvoiceFiles,
  mergeInvoicePages,
  processInvoiceFiles,
  removeInvoiceFile,
  unmergeInvoicePages,
  uploadInvoiceFiles,
} from "../controllers/claim-ai.controller";
import {
  createClaim,
  deleteClaim,
  getClaimDetail,
  listClaims,
  saveExpenses,
  splitClaim,
  splitExpense,
  updateClaim,
} from "../controllers/claim.controller";
import { requireAuth } from "../middleware/require-auth";

export const claimRouter = Router();

// No requireOwner gate — a claim is every employee's own record, the same
// posture Trip Management (018) already established.
claimRouter.use(requireAuth);

claimRouter.get("/", listClaims);
claimRouter.post("/", createClaim);
claimRouter.get("/:id", getClaimDetail);
claimRouter.patch("/:id", updateClaim);
claimRouter.delete("/:id", deleteClaim);
claimRouter.put("/:id/expenses", saveExpenses);
claimRouter.post("/:id/expenses/:expenseId/split", splitExpense);
claimRouter.get("/:id/expenses/:expenseId/duplicate-check", checkExpenseDuplicate);
claimRouter.post("/:id/split", splitClaim);

// 023's AI-Powered flow — upload, the background processing pipeline, and
// merge/unmerge invoice pages.
claimRouter.get("/:id/invoice-files", listInvoiceFiles);
claimRouter.post("/:id/invoice-files", invoiceUploadMiddleware, uploadInvoiceFiles);
claimRouter.get("/:id/invoice-files/:fileId/content", getInvoiceFileContent);
claimRouter.delete("/:id/invoice-files/:fileId", removeInvoiceFile);
claimRouter.post("/:id/invoice-files/:fileId/merge", mergeInvoicePages);
claimRouter.post("/:id/process", processInvoiceFiles);
claimRouter.get("/:id/process-status", getProcessingStatus);
claimRouter.post("/:id/expenses/:expenseId/unmerge", unmergeInvoicePages);

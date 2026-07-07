import { Router } from "express";
import {
  bulkUploadMiddleware,
  confirmBulkImport,
  downloadBulkImportErrors,
  downloadBulkTemplate,
  uploadBulkImport,
} from "../controllers/employee-bulk-invite.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireOwner } from "../middleware/require-owner";

// Mounted at /employees/bulk, as its own sibling router rather than nested
// onto employeeRouter — every route here is gated by requireOwner
// ("Company Administrator," per 010's Open Questions) on top of requireAuth,
// which nothing else under /employees is.
export const employeeBulkInviteRouter = Router();

employeeBulkInviteRouter.use(requireAuth, requireOwner);

employeeBulkInviteRouter.get("/template", downloadBulkTemplate);
employeeBulkInviteRouter.post("/upload", bulkUploadMiddleware, uploadBulkImport);
employeeBulkInviteRouter.post("/import", confirmBulkImport);
employeeBulkInviteRouter.get("/:uploadId/errors", downloadBulkImportErrors);

import type { ClaimStatus } from "../../models";

export const MIN_CLAIM_NAME_LENGTH = 2;
export const MAX_CLAIM_NAME_LENGTH = 100;
export const MIN_EXPENSE_COUNT = 1;
export const MAX_EXPENSE_COUNT = 10;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// The full status value domain — see claim.model.ts's own doc comment for
// why the display-only values beyond "draft"/"submitted" are included even
// though this epic never produces them (022's Overview).
export const CLAIM_STATUSES: readonly ClaimStatus[] = ["draft", "submitted", "pending_for_approval", "ready_for_submission", "approved_for_reimbursement"];

export const MAX_INVOICE_FILE_COUNT = 10;
export const MAX_INVOICE_FILE_SIZE_MB = 10;
export const ALLOWED_INVOICE_FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"] as const;

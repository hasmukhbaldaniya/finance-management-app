import type { ClaimStatus } from "@/types/claim.type";

export const MIN_CLAIM_NAME_LENGTH = 2;
export const MAX_CLAIM_NAME_LENGTH = 100;
export const MIN_EXPENSE_COUNT = 1;
export const MAX_EXPENSE_COUNT = 10;

export const MAX_INVOICE_FILE_COUNT = 10;
export const MAX_INVOICE_FILE_SIZE_MB = 10;
export const ALLOWED_INVOICE_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export const CLAIM_STATUS_OPTIONS: readonly { value: ClaimStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_for_approval", label: "Pending for Approval" },
  { value: "ready_for_submission", label: "Ready for Submission" },
  { value: "approved_for_reimbursement", label: "Approved for Reimbursement" },
];

// Mirrors trip.constant.ts's own TRIP_STATUS_BADGE_STYLE/LABEL shape —
// this epic only ever writes "draft"/"submitted", the rest exist so the
// listing can display/filter sample data in those states (022's Overview).
export const CLAIM_STATUS_BADGE_STYLE: Record<ClaimStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  pending_for_approval: "bg-amber-100 text-amber-800",
  ready_for_submission: "bg-amber-100 text-amber-800",
  approved_for_reimbursement: "bg-green-100 text-green-800",
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_for_approval: "Pending for Approval",
  ready_for_submission: "Ready for Submission",
  approved_for_reimbursement: "Approved for Reimbursement",
};

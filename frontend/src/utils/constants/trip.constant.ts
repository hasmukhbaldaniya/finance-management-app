import type { TripStatus } from "@/types/trip.type";

export const MIN_TRIP_NAME_LENGTH = 2;
export const MAX_TRIP_NAME_LENGTH = 100;

export const TRIP_STATUS_OPTIONS: readonly { value: TripStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "new", label: "New" },
  { value: "pending_for_approval", label: "Pending for Approval" },
  { value: "approved_for_reimbursement", label: "Approved for Reimbursement" },
];

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  draft: "Draft",
  new: "New",
  pending_for_approval: "Pending for Approval",
  approved_for_reimbursement: "Approved for Reimbursement",
};

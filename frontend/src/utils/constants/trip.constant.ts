import type { TripStatus } from "@/types/trip.type";

export const MIN_TRIP_NAME_LENGTH = 2;
export const MAX_TRIP_NAME_LENGTH = 100;

export const TRIP_STATUS_OPTIONS: readonly { value: TripStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "new", label: "New" },
  { value: "pending_for_approval", label: "Pending for Approval" },
  { value: "approved_for_reimbursement", label: "Approved for Reimbursement" },
];

// Badge styling per status — see user-stories/019-trip-listing.md's Status
// Values & Display table. Draft and New render identically apart from label
// and whether a delete icon accompanies the row (handled by the row
// component, not here).
export const TRIP_STATUS_BADGE_STYLE: Record<TripStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  new: "bg-muted text-muted-foreground",
  pending_for_approval: "bg-amber-100 text-amber-800",
  approved_for_reimbursement: "bg-green-100 text-green-800",
};

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  draft: "Draft",
  new: "New",
  pending_for_approval: "Pending for Approval",
  approved_for_reimbursement: "Approved for Reimbursement",
};

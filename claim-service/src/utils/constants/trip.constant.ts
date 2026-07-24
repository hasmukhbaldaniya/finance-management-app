import type { TripStatus } from "../../models";

export const MIN_TRIP_NAME_LENGTH = 2;
export const MAX_TRIP_NAME_LENGTH = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// The full status value domain — see trip.model.ts's own doc comment for why
// "draft" is included even though nothing in 018/019 currently produces it.
export const TRIP_STATUSES: readonly TripStatus[] = ["draft", "new", "pending_for_approval", "approved_for_reimbursement"];

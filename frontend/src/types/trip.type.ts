// The full status value domain observed in this codebase's own reference
// data — Create Trip (018) only ever writes "new"; the other three are
// reserved for future Claims/Approval stories. "draft" specifically is a
// still-unresolved gap — see 018/019's Open Questions.
export type TripStatus = "draft" | "new" | "pending_for_approval" | "approved_for_reimbursement";

export type TripListItem = {
  id: number;
  name: string;
  status: TripStatus;
  createdAt: string;
  startAt: string;
  endAt: string;
  totalAmount: string;
  approvedAmount: string | null;
};

// `id`/`countryId` make this a resubmittable value, not just a display
// string — needed so 021's Edit Trip can pre-fill CitySelect with a real
// selection (CitySelect's own `value` prop expects a full `City`-shaped
// object).
export type TripCityDetail = {
  id: number;
  countryId: number | null;
  name: string;
  countryName: string;
  countryCode: string;
};

export type TripDetail = {
  id: number;
  name: string;
  status: TripStatus;
  createdAt: string;
  startAt: string;
  endAt: string;
  startCity: TripCityDetail;
  endCity: TripCityDetail;
  totalAmount: string;
  approvedAmount: string | null;
};

// Flattened across every Claim linked to this trip (draft and submitted
// alike, matching Trip.totalAmount's own no-status-distinction rule), one
// row per Expense rather than grouped by claim.
export type TripExpenseRow = {
  id: number;
  claimId: number;
  claimName: string | null;
  categoryName: string;
  amount: string;
  expenseDate: string | null;
};

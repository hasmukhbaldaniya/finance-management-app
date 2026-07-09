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

export type TripCityDetail = {
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

export type SplitRequestSplitType = "percentage" | "amount";
export type SplitRequestMemberStatus = "pending" | "accepted" | "rejected";

// 025's Split Request Inbox — one row per request the caller was invited
// into (never their own sent requests, see SplitRequestSentItem below).
export type SplitRequestListItem = {
  id: number;
  requestedByName: string;
  requestedOn: string;
  requestedAmount: string;
  status: SplitRequestMemberStatus;
};

export type SplitRequestSentItem = {
  id: number;
  requestedOn: string;
  requestedAmount: string;
  memberCount: number;
};

export type SplitRequestMember = {
  employeeId: number;
  name: string;
  percentage: string;
  amount: string;
  isRequester: boolean;
  status: SplitRequestMemberStatus;
};

export type SplitRequestExpenseField = {
  id: number;
  fieldType: string;
  fieldName: string;
  config: Record<string, unknown>;
};

// A read-only snapshot of the original expense being split — rendered as
// the respond modal's own "Expense Form" panel, never editable by an
// invited colleague.
export type SplitRequestExpenseSnapshot = {
  id: number;
  categoryId: number | null;
  categoryName: string;
  claimName: string | null;
  isTripLinked: boolean;
  amount: string;
  fieldValues: Record<string, unknown>;
  fields: SplitRequestExpenseField[];
};

export type SplitRequestDetail = {
  id: number;
  requestedBy: string;
  requestedOn: string;
  splitType: SplitRequestSplitType;
  expense: SplitRequestExpenseSnapshot;
  members: SplitRequestMember[];
  myStatus: SplitRequestMemberStatus | null;
  isRequester: boolean;
};

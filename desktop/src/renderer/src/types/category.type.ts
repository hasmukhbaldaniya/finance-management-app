export type CategoryStatus = "draft" | "active";

export type CategoryFieldType =
  | "invoice"
  | "file_upload"
  | "amount"
  | "number"
  | "small_text"
  | "large_text"
  | "list"
  | "city_list"
  | "dropdown"
  | "radio_button"
  | "date"
  | "date_time"
  | "time"
  | "duration";

export type CategoryFieldRedFlagMode = "formula" | "ai";
export type CategoryFieldRedFlagAction = "highlight" | "block";

export type CategoryFieldConditionalVisibility = {
  dependsOnFieldId: number;
  equalsValue: string;
};

export type CategoryFieldConfig = Record<string, unknown>;

export type CategoryField = {
  id: number;
  fieldType: CategoryFieldType;
  fieldName: string;
  tooltip: string | null;
  isRequired: boolean;
  addToPolicyRules: boolean;
  position: number;
  config: CategoryFieldConfig;
  conditionalVisibility: CategoryFieldConditionalVisibility | null;
  redFlagMode: CategoryFieldRedFlagMode | null;
  redFlagValue: string | null;
  redFlagAction: CategoryFieldRedFlagAction | null;
};

// A field the wizard is still building locally, before it's ever been saved,
// gets a negative, request-scoped sentinel as its `id` instead of `null` —
// this lets one field's Conditional Visibility target another brand-new
// field added in the same sitting (both unsaved) by referencing that
// sentinel; the backend resolves it to a real id once every field in the
// batch is persisted (see backend/src/controllers/category-fields.controller.ts).
// A positive `id` means the field already exists in the database.
export type CategoryFieldDraft = CategoryField;

export type CategoryEligibilityType = "department" | "grade" | "project" | "employee";

export type CategoryPolicyEligibility = {
  eligibilityType: CategoryEligibilityType;
  entityIds: number[];
};

export type CategoryRuleType = "field_specific" | "combination";

export type CategoryPolicyRule = {
  level: number;
  ruleType: CategoryRuleType;
  fieldId: number | null;
  operator: string | null;
  value: string | null;
  comparisonFieldId: number | null;
  comparisonValue: string | null;
  amountFieldId: number | null;
  amountOperator: string | null;
  amountValue: string | null;
};

export type CategoryApproverGroup = {
  logicGroup: number;
  employeeIds: number[];
};

export type CategoryApprovalStage = {
  stageNumber: number;
  approverGroups: CategoryApproverGroup[];
};

export type CategoryApprovalLevel = {
  level: number | null;
  isDefaultFlow: boolean;
  autoApprove: boolean;
  stages: CategoryApprovalStage[];
};

export type CategoryPolicyType = "claim" | "exception" | "project";

export type CategoryPolicy = {
  id?: number;
  policyType?: CategoryPolicyType;
  name: string;
  position?: number;
  eligibility: CategoryPolicyEligibility[];
  rules: CategoryPolicyRule[];
  approvalLevels: CategoryApprovalLevel[];
};

export type CategorySnapshot = {
  id: number;
  name: string;
  description: string | null;
  status: CategoryStatus;
  isEnabled: boolean;
  enableProjectPolicies: boolean;
  ziptrripCategoryKeys: string[];
  fields: CategoryField[];
  claimPolicies: CategoryPolicy[];
  exceptionPolicies: CategoryPolicy[];
  projectPolicies: CategoryPolicy[];
};

export type CategoryWizardStep = "basicDetails" | "expenseForm" | "policiesAndApprovals" | "projectPolicies";

export type CategoryListItem = {
  id: number;
  name: string;
  description: string | null;
  status: CategoryStatus;
  isEnabled: boolean;
  updatedAt: string;
};

export type CategoryVersionCreatedBy = {
  name: string;
  email: string;
} | null;

export type CategoryVersionListItem = {
  version: string;
  isMajor: boolean;
  createdAt: string;
  createdBy: CategoryVersionCreatedBy;
};

export type CategoryVersionsResponse =
  | { isDraft: true }
  | { isDraft: false; versions: CategoryVersionListItem[] };

export type CategoryVersionDetail = {
  category: CategorySnapshot;
  modifiedSteps: CategoryWizardStep[];
};

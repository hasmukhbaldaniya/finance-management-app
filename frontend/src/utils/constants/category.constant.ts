import type { CategoryStepSegment } from "@/utils/constants/route.constant";
import type { CategoryFieldType, CategoryWizardStep } from "@/types/category.type";

// Matches user-stories/013-category-creation.md's Field Library exactly —
// order here is the display order in the Field Library panel. Kept
// byte-identical to backend/src/utils/constants/category.constant.ts.
export const CATEGORY_FIELD_TYPES: readonly CategoryFieldType[] = [
  "invoice",
  "file_upload",
  "amount",
  "number",
  "small_text",
  "large_text",
  "list",
  "city_list",
  "dropdown",
  "radio_button",
  "date",
  "date_time",
  "time",
  "duration",
];

export const CATEGORY_FIELD_TYPE_LABELS: Record<CategoryFieldType, string> = {
  invoice: "Invoice",
  file_upload: "File Upload",
  amount: "Amount",
  number: "Number",
  small_text: "Small Text",
  large_text: "Large Text",
  list: "List",
  city_list: "City List",
  dropdown: "Dropdown",
  radio_button: "Radio Button",
  date: "Date",
  date_time: "Date & Time",
  time: "Time",
  duration: "Duration",
};

export const NUMERIC_FIELD_TYPES: readonly CategoryFieldType[] = ["amount", "number"];
export const LIST_LIKE_FIELD_TYPES: readonly CategoryFieldType[] = ["list", "city_list", "dropdown"];
export const SINGLE_INSTANCE_FIELD_TYPES: readonly CategoryFieldType[] = ["invoice"];

export const MAX_FIELD_NAME_LENGTH = 100;
export const MIN_FIELD_NAME_LENGTH = 2;
export const MAX_TOOLTIP_LENGTH = 250;
export const MIN_TOOLTIP_LENGTH = 10;
export const MAX_RED_FLAG_DESCRIPTION_LENGTH = 500;
export const MIN_RED_FLAG_DESCRIPTION_LENGTH = 50;
export const MIN_FILE_SIZE_MB = 1;
export const MAX_FILE_SIZE_MB = 50;
export const MIN_FILE_COUNT = 1;
export const MAX_FILE_COUNT = 10;
export const DEFAULT_FILE_SIZE_MB = 10;
export const DEFAULT_FILE_COUNT = 1;
export const ALLOWED_FILE_TYPES = ["PDF", "JPG", "PNG", "JPEG"] as const;

export const MAX_CATEGORY_NAME_LENGTH = 100;
export const MIN_CATEGORY_NAME_LENGTH = 2;
export const MAX_DESCRIPTION_LENGTH = 1000;

export const MAX_CLAIM_POLICIES = 20;
export const MAX_EXCEPTION_POLICIES = 5;
export const MAX_PROJECT_POLICIES = 5;
export const MIN_APPROVAL_LEVEL = 1;
export const MAX_APPROVAL_LEVEL = 5;
export const MIN_APPROVERS_PER_STAGE = 1;
export const MAX_APPROVERS_PER_STAGE = 3;

export const TOTAL_WIZARD_STEPS = 4;

// Static, hardcoded per 013's explicit instruction — not a live Ziptrrip
// integration.
export const ZIPTRRIP_CATEGORIES: readonly { key: string; label: string }[] = [
  { key: "domestic_flight", label: "Domestic Flight" },
  { key: "international_flight", label: "International Flight" },
  { key: "domestic_hotel_dynamic", label: "Domestic Hotel Dynamic" },
  { key: "domestic_hotel_contracted", label: "Domestic Hotel Contracted" },
  { key: "domestic_hotel_guesthouse", label: "Domestic Hotel GuestHouse" },
  { key: "international_hotel_dynamic", label: "International Hotel Dynamic" },
  { key: "train_sleeper", label: "Train Sleeper" },
  { key: "train_ss", label: "Train SS" },
];

// The List field type's "Values List" dropdown — which predefined lookup
// backs a given List field. Airlines and Based Locations are the starting
// two (013's Open Questions) — extend here, not inline wherever rendered.
export const CATEGORY_LIST_VALUE_SOURCES: readonly { key: string; label: string }[] = [
  { key: "airlines", label: "Airlines" },
  { key: "based_locations", label: "Based Locations" },
];

// A fixed city list backs every City List field — no per-field configuration
// of *which* cities, only Min/Max selection count once Allow Multi-Select is on.
export const CATEGORY_CITY_LIST: readonly string[] = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Ahmedabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Jaipur",
  "Surat",
];

export const CATEGORY_WIZARD_STEP_LABELS: Record<CategoryWizardStep, { title: string; subtitle: string }> = {
  basicDetails: { title: "Basic Details", subtitle: "Setup category" },
  expenseForm: { title: "Expense Form", subtitle: "Build the claim form" },
  policiesAndApprovals: { title: "Policies & Approvals", subtitle: "Claim & exception rules" },
  projectPolicies: { title: "Project Based Policies & Approvals", subtitle: "Optional project rules" },
};

// Ordered list driving both the wizard's step nav and the Category Details
// page's left rail — camelCase keys (CategoryWizardStep, matching the
// backend's modifiedSteps values) map to kebab-case URL segments here.
export const CATEGORY_WIZARD_STEPS: readonly CategoryWizardStep[] = [
  "basicDetails",
  "expenseForm",
  "policiesAndApprovals",
  "projectPolicies",
];

export const CATEGORY_STEP_SEGMENTS: Record<CategoryWizardStep, CategoryStepSegment> = {
  basicDetails: "basic-details",
  expenseForm: "expense-form",
  policiesAndApprovals: "policies",
  projectPolicies: "project-policies",
};

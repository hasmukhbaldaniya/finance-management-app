import type { CategoryFieldType } from "../../models";

// Matches user-stories/013-category-creation.md's Field Library exactly —
// order here is the display order in the Field Library panel.
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
] as const;

// Field types whose Formula Builder/combination-rule value may be summed or
// compared numerically — Date fields are handled separately (difference
// only, see the formula parser).
export const NUMERIC_FIELD_TYPES: readonly CategoryFieldType[] = ["amount", "number"];

// Only one Invoice field is allowed per form (010's own equivalent limit is
// per-employee FF numbers; this is a distinct, category-form-level cap) —
// see 013's Field-specific configuration table.
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

// A version bump is "major" once this many of the 4 wizard steps differ from
// the previous version — see user-stories/016-category-version-history.md's
// Versioning Scheme.
export const MAJOR_VERSION_STEP_THRESHOLD = 3;
export const TOTAL_WIZARD_STEPS = 4;

// Static, hardcoded per 013's explicit instruction — not a live Ziptrrip
// integration. Extend this list, don't fetch it from anywhere.
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
// backs a given List field. Confirmed as an extensible, centrally-defined
// set (013's Open Questions) — Airlines and Based Locations are the starting
// two; add more keys here as they're provided, not inline wherever rendered.
export const CATEGORY_LIST_VALUE_SOURCES: readonly { key: string; label: string }[] = [
  { key: "airlines", label: "Airlines" },
  { key: "based_locations", label: "Based Locations" },
];

// A fixed, comprehensive city list backs every City List field — no
// per-field configuration of *which* cities, only Min/Max selection count
// once Allow Multi-Select is on (013's Field-specific configuration table).
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

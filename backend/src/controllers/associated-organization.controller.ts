import type { Response } from "express";
import { AssociatedOrganization, Organization } from "../models";
import type { OwnerRequest } from "../middleware/require-owner";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const NOT_FOUND_MESSAGE = "Associated organization not found.";

const SORTABLE_FIELDS = [
  "organizationName",
  "contactName",
  "contactEmail",
  "contactPhone",
  "registrations",
  "invitedAt",
  "isActive",
] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

type RegistrationsLabel = "Self-Registered" | "Invited" | "Registered";

function deriveRegistrationsLabel(row: AssociatedOrganization): RegistrationsLabel {
  if (row.registrationType === "self_registered") return "Self-Registered";
  return row.organizationId ? "Registered" : "Invited";
}

function parseMultiValue(value: unknown): string[] {
  return typeof value === "string" && value.length > 0 ? value.split(",") : [];
}

function parseTextFilter(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function listAssociatedOrganizations(req: OwnerRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const registrationsFilter = parseMultiValue(req.query.registrations);
  const statusFilter = parseMultiValue(req.query.status);
  const organizationNameFilter = parseTextFilter(req.query.organizationName);
  const contactNameFilter = parseTextFilter(req.query.contactName);
  const contactEmailFilter = parseTextFilter(req.query.contactEmail);
  const contactPhoneFilter = parseTextFilter(req.query.contactPhone);
  const sortBy: SortableField = SORTABLE_FIELDS.includes(req.query.sortBy as SortableField)
    ? (req.query.sortBy as SortableField)
    : "organizationName";
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));

  const rows = await AssociatedOrganization.findAll({ where: { ownerOrganizationId: organizationId } });
  const organizations = await Organization.findAll({
    where: { id: rows.map((row) => row.organizationId).filter((id): id is number => id !== null) },
  });
  const organizationNameById = new Map(organizations.map((organization) => [organization.id, organization.name]));

  let items = rows.map((row) => ({
    id: row.id,
    organizationName: row.organizationId ? organizationNameById.get(row.organizationId) ?? null : null,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    registrations: deriveRegistrationsLabel(row),
    invitedAt: row.invitedAt,
    isActive: row.isActive,
  }));

  if (registrationsFilter.length > 0) {
    items = items.filter((item) => registrationsFilter.includes(item.registrations));
  }
  if (statusFilter.length > 0) {
    items = items.filter((item) => statusFilter.includes(item.isActive ? "Active" : "Disabled"));
  }
  // Per-column text filters — substring, case-insensitive. Applied in memory
  // alongside the categorical filters above, for the same reason (organizationName
  // is joined/derived, not a plain column on this table).
  if (organizationNameFilter) {
    items = items.filter((item) => (item.organizationName ?? "").toLowerCase().includes(organizationNameFilter));
  }
  if (contactNameFilter) {
    items = items.filter((item) => item.contactName.toLowerCase().includes(contactNameFilter));
  }
  if (contactEmailFilter) {
    items = items.filter((item) => item.contactEmail.toLowerCase().includes(contactEmailFilter));
  }
  if (contactPhoneFilter) {
    items = items.filter((item) => item.contactPhone.toLowerCase().includes(contactPhoneFilter));
  }

  // organizationName/registrations/invitedAt/isActive can't all be ORDER BY'd
  // alongside LIMIT/OFFSET in the same query as the filters above (some are
  // derived, and a null organizationName needs a stable sort position) — sorted
  // and paginated here in memory instead, the same trade-off Grade/Department/
  // Role make for their own derived columns (see 007's Open Questions).
  items.sort((a, b) => {
    let comparison: number;
    if (sortBy === "invitedAt") {
      comparison = (a.invitedAt?.getTime() ?? 0) - (b.invitedAt?.getTime() ?? 0);
    } else if (sortBy === "isActive") {
      comparison = Number(a.isActive) - Number(b.isActive);
    } else if (sortBy === "organizationName") {
      comparison = (a.organizationName ?? "").localeCompare(b.organizationName ?? "");
    } else {
      comparison = String(a[sortBy]).localeCompare(String(b[sortBy]));
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  res.status(200).json({ associatedOrganizations: pageItems, hasMore: start + pageSize < items.length });
}

export async function updateAssociatedOrganizationStatus(req: OwnerRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const id = Number(req.params.id);
  const row = await AssociatedOrganization.findOne({ where: { id, ownerOrganizationId: organizationId } });
  if (!row) {
    res.status(404).json({ error: NOT_FOUND_MESSAGE });
    return;
  }

  if (typeof req.body?.isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean." });
    return;
  }

  row.isActive = req.body.isActive;
  await row.save();

  res.status(200).json({ associatedOrganization: { id: row.id, isActive: row.isActive } });
}

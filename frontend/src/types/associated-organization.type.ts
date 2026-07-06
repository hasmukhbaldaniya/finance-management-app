export type RegistrationsLabel = "Registered" | "Self-Registered" | "Invited";

export type AssociatedOrganization = {
  id: number;
  organizationName: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  registrations: RegistrationsLabel;
  invitedAt: string | null;
  isActive: boolean;
};

export type AssociatedOrganizationSortBy =
  | "organizationName"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "registrations"
  | "invitedAt"
  | "isActive";

export type { SortDirection } from "./pagination.type";

import { createContext } from "react";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";

export type SessionState = {
  user: AuthUser;
  organization: Organization | null;
  isOwner: boolean;
  setOrganization: (organization: Organization) => void;
};

export const SessionContext = createContext<SessionState | null>(null);

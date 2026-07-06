import { createContext } from "react";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";

export type SessionState = {
  user: AuthUser;
  organization: Organization | null;
  setOrganization: (organization: Organization) => void;
};

export const SessionContext = createContext<SessionState | null>(null);

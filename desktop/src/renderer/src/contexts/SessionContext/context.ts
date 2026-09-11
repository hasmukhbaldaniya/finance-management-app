import { createContext } from "react";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";

export type SessionState = {
  user: AuthUser;
  organization: Organization | null;
  isOwner: boolean;
  // True once the Zoho SalesIQ widget script has loaded successfully — false
  // while loading, if it fails, or if NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_CODE
  // isn't configured. `help/page.tsx`'s "Chat with Us" button reads this to
  // hide itself rather than show a no-op button (017's own degrade-gracefully
  // posture — see ZohoSalesIqWidget below).
  isSalesIqAvailable: boolean;
};

export const SessionContext = createContext<SessionState | null>(null);

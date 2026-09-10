"use client";

import { useContext } from "react";
import { SessionContext, type SessionState } from "./context";

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

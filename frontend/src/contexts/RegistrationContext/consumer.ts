"use client";

import { useContext } from "react";
import { RegistrationContext, type RegistrationState } from "./context";

export function useRegistration(): RegistrationState {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used within a RegistrationProvider");
  }
  return context;
}

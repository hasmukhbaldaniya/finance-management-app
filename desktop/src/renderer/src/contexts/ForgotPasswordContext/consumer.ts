"use client";

import { useContext } from "react";
import { ForgotPasswordContext, type ForgotPasswordState } from "./context";

export function useForgotPassword(): ForgotPasswordState {
  const context = useContext(ForgotPasswordContext);
  if (!context) {
    throw new Error("useForgotPassword must be used within a ForgotPasswordProvider");
  }
  return context;
}

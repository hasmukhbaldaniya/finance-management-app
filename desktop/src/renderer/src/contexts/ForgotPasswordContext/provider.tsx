"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ForgotPasswordContext, type ForgotPasswordState } from "./context";

export function ForgotPasswordProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  const value = useMemo<ForgotPasswordState>(
    () => ({
      email,
      resetToken,
      setEmail,
      setResetToken,
      reset: () => {
        setEmail("");
        setResetToken("");
      },
    }),
    [email, resetToken]
  );

  return <ForgotPasswordContext.Provider value={value}>{children}</ForgotPasswordContext.Provider>;
}

"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ForgotPasswordState = {
  email: string;
  resetToken: string;
  setEmail: (email: string) => void;
  setResetToken: (resetToken: string) => void;
  reset: () => void;
};

const ForgotPasswordContext = createContext<ForgotPasswordState | null>(null);

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

export function useForgotPassword(): ForgotPasswordState {
  const context = useContext(ForgotPasswordContext);
  if (!context) {
    throw new Error("useForgotPassword must be used within a ForgotPasswordProvider");
  }
  return context;
}

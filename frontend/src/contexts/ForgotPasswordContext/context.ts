import { createContext } from "react";

export type ForgotPasswordState = {
  email: string;
  resetToken: string;
  setEmail: (email: string) => void;
  setResetToken: (resetToken: string) => void;
  reset: () => void;
};

export const ForgotPasswordContext = createContext<ForgotPasswordState | null>(null);

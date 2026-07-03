import type { ReactNode } from "react";
import { ForgotPasswordProvider } from "./forgot-password-context";

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return <ForgotPasswordProvider>{children}</ForgotPasswordProvider>;
}

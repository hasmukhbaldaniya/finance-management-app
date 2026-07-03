import type { ReactNode } from "react";
import { ForgotPasswordProvider } from "@/contexts/ForgotPasswordContext";

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return <ForgotPasswordProvider>{children}</ForgotPasswordProvider>;
}

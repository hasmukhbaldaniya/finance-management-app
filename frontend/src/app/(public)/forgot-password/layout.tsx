import type { ReactNode } from "react";
import { ForgotPasswordProvider } from "@/contexts/ForgotPasswordContext";

type ForgotPasswordLayoutProps = {
  children: ReactNode;
};

export default function ForgotPasswordLayout({ children }: ForgotPasswordLayoutProps) {
  return <ForgotPasswordProvider>{children}</ForgotPasswordProvider>;
}

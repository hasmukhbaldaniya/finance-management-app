import type { ReactNode } from "react";
import { RegistrationProvider } from "@/contexts/RegistrationContext";

type RegisterLayoutProps = {
  children: ReactNode;
};

export default function RegisterLayout({ children }: RegisterLayoutProps) {
  return <RegistrationProvider>{children}</RegistrationProvider>;
}

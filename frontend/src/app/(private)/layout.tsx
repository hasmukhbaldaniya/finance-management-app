import type { ReactNode } from "react";
import { SessionProvider } from "@/contexts/SessionContext";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

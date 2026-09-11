// Ported from frontend/src/app/(public)/register/layout.tsx.
// <Outlet/> stands in for Next's implicit `children`.
import { Outlet } from "react-router";
import { RegistrationProvider } from "@/contexts/RegistrationContext";

export function RegisterLayout() {
  return (
    <RegistrationProvider>
      <Outlet />
    </RegistrationProvider>
  );
}

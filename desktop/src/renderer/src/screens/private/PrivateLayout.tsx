// Ported from frontend/src/app/(private)/layout.tsx — trivial: all real
// work (the getMe() bootstrap, the 401 redirect, the header/shell) lives in
// SessionProvider. Rendered as the element on every route nested under the
// "private" branch of routes.tsx, with an <Outlet/> standing in for
// Next's implicit `children`.
import { Outlet } from "react-router";
import { SessionProvider } from "@/contexts/SessionContext";

export function PrivateLayout() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}

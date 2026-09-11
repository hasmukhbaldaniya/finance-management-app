// Ported from frontend/src/app/(public)/login/layout.tsx. next/navigation's
// useRouter -> react-router's useNavigate; router.replace -> navigate(...,
// { replace: true }). Same behavior: an already-authenticated visitor is
// redirected to the Dashboard without the Login screen ever rendering.
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import { getMe } from "@/apis/auth";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/utils/constants/route.constant";

export function LoginLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getMe()
      .then(() => {
        if (isMounted) navigate(ROUTES.DASHBOARD, { replace: true });
      })
      .catch(() => {
        if (isMounted) setIsChecking(false);
      });
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (isChecking) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  return <>{children}</>;
}

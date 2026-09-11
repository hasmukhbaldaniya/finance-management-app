// Ported from frontend/src/app/(public)/forgot-password/layout.tsx — same
// next/navigation -> react-router swap as LoginLayout.
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import { getMe } from "@/apis/auth";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/utils/constants/route.constant";
import { ForgotPasswordProvider } from "@/contexts/ForgotPasswordContext";

export function ForgotPasswordLayout({ children }: { children: ReactNode }) {
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

  return <ForgotPasswordProvider>{children}</ForgotPasswordProvider>;
}

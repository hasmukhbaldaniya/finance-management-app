"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import { getMe } from "@/apis/auth";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/utils/constants/route.constant";
import { ForgotPasswordProvider } from "@/contexts/ForgotPasswordContext";

type ForgotPasswordLayoutProps = {
  children: ReactNode;
};

// 001's own Access & Permission Rules (TC-28): an already-authenticated
// visitor to any Forgot Password step is redirected to the Dashboard
// without the auth screen ever rendering.
export default function ForgotPasswordLayout({ children }: ForgotPasswordLayoutProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getMe()
      .then(() => {
        if (isMounted) router.replace(ROUTES.DASHBOARD);
      })
      .catch(() => {
        if (isMounted) setIsChecking(false);
      });
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isChecking) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  return <ForgotPasswordProvider>{children}</ForgotPasswordProvider>;
}

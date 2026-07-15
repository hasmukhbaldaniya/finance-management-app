"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import { getMe } from "@/apis/auth";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/utils/constants/route.constant";

// 001's own Access & Permission Rules (TC-27): an already-authenticated
// visitor is redirected to the Dashboard without the Login screen ever
// rendering — not just left reachable and hoping no one hits it.
export default function LoginLayout({ children }: { children: ReactNode }) {
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

  return <>{children}</>;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getMe } from "@/apis/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ZohoSalesIqWidget } from "@/components/zoho-salesiq-widget";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { SessionContext } from "./context";

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [isSalesIqAvailable, setIsSalesIqAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let isRedirecting = false;

    getMe()
      .then(({ user: fetchedUser, organization: fetchedOrganization, isOwner: fetchedIsOwner }) => {
        if (isMounted) {
          setUser(fetchedUser);
          setOrganization(fetchedOrganization);
          setIsOwner(fetchedIsOwner);
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        if (error instanceof ApiError && error.status === 401) {
          isRedirecting = true;
          router.replace(ROUTES.LOGIN);
          return;
        }
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted && !isRedirecting) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <Stack direction="row" spacing={1} sx={{ minHeight: "100svh", flex: 1, alignItems: "center", justifyContent: "center", fontSize: "0.875rem", color: "text.secondary" }}>
        <Spinner />
        Loading…
      </Stack>
    );
  }

  if (loadError || !user) {
    return (
      <Stack spacing={2} sx={{ minHeight: "100svh", flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {loadError ?? GENERIC_ERROR_MESSAGE}
        </Typography>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Stack>
    );
  }

  return (
    <SessionContext.Provider value={{ user, organization, isOwner, isSalesIqAvailable }}>
      {/*
        `position: fixed, inset: 0` (not min-height: 100svh) is deliberate:
        pinning directly to the viewport makes this shell immune to any
        parent (html/body) sizing mismatch between percentage and viewport
        units — the kind of 1px rounding difference that silently triggers a
        persistent, always-visible browser scrollbar even though nothing is
        actually meant to overflow. Every private page's own scrolling (if
        any) happens *inside* this box.
      */}
      <Box sx={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "grey.50" }}>
        <Header user={user} organization={organization} isOwner={isOwner} />
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>{children}</Box>
      </Box>
      <ZohoSalesIqWidget
        visitorName={user.name}
        visitorEmail={user.email}
        organizationName={organization?.name ?? null}
        onAvailabilityChange={setIsSalesIqAvailable}
      />
    </SessionContext.Provider>
  );
}

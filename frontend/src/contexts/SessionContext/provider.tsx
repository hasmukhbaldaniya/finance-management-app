"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
      <div className="flex min-h-svh flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading…
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">{loadError ?? GENERIC_ERROR_MESSAGE}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, organization, isOwner, isSalesIqAvailable }}>
      {/*
        `fixed inset-0` (not h-svh/min-h-svh) is deliberate: pinning directly to
        the viewport makes this shell immune to any parent (html/body) sizing
        mismatch between percentage and viewport units — the kind of 1px
        rounding difference that silently triggers a persistent, always-visible
        browser scrollbar even though nothing is actually meant to overflow.
        Every private page's own scrolling (if any) happens *inside* this box.
      */}
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-50 dark:bg-black">
        <Header user={user} organization={organization} isOwner={isOwner} />
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
      <ZohoSalesIqWidget
        visitorName={user.name}
        visitorEmail={user.email}
        organizationName={organization?.name ?? null}
        onAvailabilityChange={setIsSalesIqAvailable}
      />
    </SessionContext.Provider>
  );
}

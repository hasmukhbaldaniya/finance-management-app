"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getMe } from "@/apis/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { SessionContext } from "./context";

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    let isRedirecting = false;

    getMe()
      .then(({ user: fetchedUser, organization: fetchedOrganization }) => {
        if (isMounted) {
          setUser(fetchedUser);
          setOrganization(fetchedOrganization);
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
    <SessionContext.Provider value={{ user, organization, setOrganization }}>
      <div className="flex min-h-svh flex-1 flex-col bg-zinc-50 dark:bg-black">
        <Header user={user} organization={organization} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </SessionContext.Provider>
  );
}

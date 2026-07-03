"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getMe, logout } from "@/apis/auth";
import type { AuthUser } from "@/types/auth.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    let isRedirecting = false;

    getMe()
      .then(({ user: fetchedUser }) => {
        if (isMounted) setUser(fetchedUser);
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

  async function handleLogout(): Promise<void> {
    try {
      await logout();
      router.push(ROUTES.LOGIN);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <Logo />
        {user ? (
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading…
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : user ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

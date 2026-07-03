"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/lib/api";
import { getMe, logout, type AuthUser } from "@/lib/auth-api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getMe()
      .then(({ user: fetchedUser }) => {
        if (isMounted) setUser(fetchedUser);
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      router.push("/login");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 dark:bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>
      <Button onClick={handleLogout}>Log out</Button>
    </div>
  );
}

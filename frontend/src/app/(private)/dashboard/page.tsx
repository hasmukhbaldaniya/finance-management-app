"use client";

import { useSession } from "@/contexts/SessionContext";

export default function DashboardPage() {
  const { user, organization } = useSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        {organization ? (
          <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Organization</p>
            <p className="mt-1 text-sm font-semibold">{organization.name}</p>
            <p className="text-sm text-muted-foreground">GSTIN: {organization.gstNumber}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

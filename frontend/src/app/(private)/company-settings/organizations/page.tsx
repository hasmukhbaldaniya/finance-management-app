"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/contexts/SessionContext";
import { getMyOrganizations } from "@/apis/organization";
import { switchActiveOrganization } from "@/apis/user";
import type { OrganizationMembership } from "@/types/organization.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

export default function AssociatedOrganizationsPage() {
  const { setOrganization } = useSession();
  const [organizations, setOrganizations] = useState<OrganizationMembership[] | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyOrganizations()
      .then(({ organizations: fetched }) => {
        if (isMounted) setOrganizations(fetched);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSwitch(organizationId: number): Promise<void> {
    setSwitchingId(organizationId);
    try {
      const { organization } = await switchActiveOrganization(organizationId);
      setOrganization(organization);
      setOrganizations(
        (previous) => previous?.map((org) => ({ ...org, isActive: org.id === organizationId })) ?? previous
      );
      toast.success("Organization switched.");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href={ROUTES.DASHBOARD} className="text-sm text-primary underline-offset-4 hover:underline">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Associated Organizations</h1>

      {loadError ? (
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : organizations ? (
        <ul className="mt-6 flex flex-col gap-3">
          {organizations.map((organization) => (
            <li
              key={organization.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  {organization.name}
                  {organization.isActive ? <span className="ml-2 text-xs text-primary">(Active)</span> : null}
                </p>
                <p className="text-sm text-muted-foreground">GSTIN: {organization.gstNumber}</p>
              </div>
              <Button
                variant="outline"
                disabled={organization.isActive || switchingId === organization.id}
                onClick={() => handleSwitch(organization.id)}
              >
                {switchingId === organization.id ? <Spinner /> : null}
                Switch
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading…
        </div>
      )}
    </div>
  );
}

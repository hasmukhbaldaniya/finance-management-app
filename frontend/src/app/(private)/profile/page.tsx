"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { getMyProfile } from "@/apis/employee";
import type { MyProfile } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { cn } from "@/lib/utils";

function display(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

type ProfileFieldProps = {
  label: string;
  value: string;
};

function ProfileField({ label, value }: ProfileFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getMyProfile()
      .then(({ employee }) => {
        if (isMounted) setProfile(employee);
      })
      .catch((error: unknown) => {
        if (isMounted) setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  function handleSaved(updated: MyProfile): void {
    setProfile(updated);
    // Note: the header's own cached name (from SessionContext, fetched once
    // on mount) won't reflect a name change made here until the next full
    // page load — SessionContext has no refetch/invalidation mechanism to
    // hook into yet.
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner />
        Loading…
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">{loadError ?? GENERIC_ERROR_MESSAGE}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(true)}>
            Change Password
          </Button>
          <Button type="button" onClick={() => setIsEditOpen(true)}>
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-8 rounded-lg border border-border bg-background p-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Personal Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileField label="Title" value={display(profile.title)} />
            <ProfileField label="Full Name" value={`${profile.firstName} ${profile.lastName}`.trim()} />
            <ProfileField label="Email" value={profile.email} />
            <ProfileField
              label="Contact Number"
              value={profile.contactNumber ? `${profile.countryCode ?? ""} ${profile.contactNumber}`.trim() : "—"}
            />
            <ProfileField label="Date of Birth" value={display(profile.dob)} />
            <ProfileField label="Gender" value={display(profile.gender)} />
            <ProfileField label="Employee ID" value={display(profile.employeeCode)} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Organization</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileField label="Organization" value={display(profile.organizationName)} />
            <ProfileField label="Role" value={display(profile.role)} />
            <ProfileField label="Department" value={display(profile.department)} />
            <ProfileField label="Grade" value={display(profile.grade)} />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Employee Status</p>
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                  profile.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {profile.status === "active" ? "Active" : "Suspended"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <EditProfileDialog open={isEditOpen} onOpenChange={setIsEditOpen} profile={profile} onSaved={handleSaved} />
      <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
    </div>
  );
}

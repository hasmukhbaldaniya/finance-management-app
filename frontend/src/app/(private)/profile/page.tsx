"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { getMyProfile } from "@/apis/employee";
import type { MyProfile } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { statusTones } from "@/theme/colors";

function display(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

type ProfileFieldProps = {
  label: string;
  value: string;
};

function ProfileField({ label, value }: ProfileFieldProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
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
      <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: "center", justifyContent: "center", py: 5, fontSize: "0.875rem", color: "text.secondary" }}>
        <Spinner />
        Loading…
      </Stack>
    );
  }

  if (loadError || !profile) {
    return (
      <Stack spacing={2} sx={{ mx: "auto", width: "100%", maxWidth: 768, flex: 1, alignItems: "center", px: 2, py: 5, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {loadError ?? GENERIC_ERROR_MESSAGE}
        </Typography>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 768, flex: 1, px: 2, py: 5 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
          My Profile
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(true)}>
            Change Password
          </Button>
          <Button type="button" onClick={() => setIsEditOpen(true)}>
            Edit Profile
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={4} sx={{ mt: 3, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 3 }}>
        <Stack component="section" spacing={2}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Personal Details
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
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
          </Box>
        </Stack>

        <Stack component="section" spacing={2}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Organization
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <ProfileField label="Organization" value={display(profile.organizationName)} />
            <ProfileField label="Role" value={display(profile.role)} />
            <ProfileField label="Department" value={display(profile.department)} />
            <ProfileField label="Grade" value={display(profile.grade)} />
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Employee Status
              </Typography>
              <Chip
                label={profile.status === "active" ? "Active" : "Suspended"}
                size="small"
                sx={{
                  alignSelf: "flex-start",
                  fontWeight: 500,
                  bgcolor: profile.status === "active" ? statusTones.accepted.background : "action.hover",
                  color: profile.status === "active" ? statusTones.accepted.text : "text.secondary",
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </Stack>

      <EditProfileDialog open={isEditOpen} onOpenChange={setIsEditOpen} profile={profile} onSaved={handleSaved} />
      <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
    </Box>
  );
}

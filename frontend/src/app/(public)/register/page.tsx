"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getGstAvailability } from "@/apis/organization";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidGstNumber } from "@/utils/helpers/validation.helper";
import { useRegistration } from "@/contexts/RegistrationContext";

type FieldErrors = {
  organizationName?: string;
  gstNumber?: string;
};

type GstStatus = "idle" | "checking" | "available" | "taken";

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const { organizationName: contextOrgName, gstNumber: contextGstNumber, setOrganizationName, setGstNumber } =
    useRegistration();
  const [organizationName, setOrganizationNameInput] = useState(contextOrgName);
  const [gstNumber, setGstNumberInput] = useState(contextGstNumber);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [gstStatus, setGstStatus] = useState<GstStatus>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function checkGstAvailability(value: string): Promise<GstStatus> {
    if (!isValidGstNumber(value)) {
      return "idle";
    }
    setGstStatus("checking");
    try {
      const { available } = await getGstAvailability(value);
      const status: GstStatus = available ? "available" : "taken";
      setGstStatus(status);
      return status;
    } catch {
      setGstStatus("idle");
      return "idle";
    }
  }

  async function handleGstBlur(): Promise<void> {
    const trimmed = gstNumber.trim().toUpperCase();
    setGstNumberInput(trimmed);
    if (trimmed) {
      await checkGstAvailability(trimmed);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedName = organizationName.trim();
    const trimmedGst = gstNumber.trim().toUpperCase();
    const nextErrors: FieldErrors = {};

    if (trimmedName.length < 2 || trimmedName.length > 150) {
      nextErrors.organizationName = "Enter a valid organization name.";
    }
    if (!isValidGstNumber(trimmedGst)) {
      nextErrors.gstNumber = "Enter a valid 15-character GST number.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const status = gstStatus === "available" ? "available" : await checkGstAvailability(trimmedGst);
      if (status !== "available") {
        setErrors({ gstNumber: "This GST number is already registered." });
        return;
      }

      setOrganizationName(trimmedName);
      setGstNumber(trimmedGst);
      router.push(ROUTES.REGISTER.DETAILS);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Register your company" description="Let's start with your organization details.">
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
        <Stack spacing={0.75}>
          <Label htmlFor="organizationName">Organization Name</Label>
          <Input
            id="organizationName"
            name="organizationName"
            value={organizationName}
            onChange={(event) => setOrganizationNameInput(event.target.value)}
            aria-invalid={Boolean(errors.organizationName)}
            aria-describedby={errors.organizationName ? "organizationName-error" : undefined}
          />
          {errors.organizationName ? (
            <Typography id="organizationName-error" variant="caption" color="error">
              {errors.organizationName}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.75}>
          <Label htmlFor="gstNumber">GST Number</Label>
          <Input
            id="gstNumber"
            name="gstNumber"
            value={gstNumber}
            onChange={(event) => {
              setGstNumberInput(event.target.value);
              setGstStatus("idle");
            }}
            onBlur={handleGstBlur}
            aria-invalid={Boolean(errors.gstNumber)}
            aria-describedby={errors.gstNumber ? "gstNumber-error" : undefined}
          />
          {errors.gstNumber ? (
            <Typography id="gstNumber-error" variant="caption" color="error">
              {errors.gstNumber}
            </Typography>
          ) : gstStatus === "checking" ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Spinner size={12} />
              <Typography variant="caption" color="text.secondary">
                Checking availability…
              </Typography>
            </Stack>
          ) : gstStatus === "available" ? (
            <Typography variant="caption" color="text.secondary">
              GST number is available.
            </Typography>
          ) : gstStatus === "taken" ? (
            <Typography variant="caption" color="error">
              This GST number is already registered.
            </Typography>
          ) : null}
        </Stack>

        <Button type="submit" sx={{ width: "100%" }} disabled={isSubmitting || gstStatus === "checking" || gstStatus === "taken"}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Checking…" : "Continue"}
        </Button>

        <Typography align="center" variant="body2">
          <MuiLink component={Link} href={ROUTES.LOGIN} underline="hover">
            Already have an account? Log in
          </MuiLink>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

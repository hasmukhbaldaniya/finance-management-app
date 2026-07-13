"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
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
            <p id="organizationName-error" className="text-xs text-destructive">
              {errors.organizationName}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
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
            <p id="gstNumber-error" className="text-xs text-destructive">
              {errors.gstNumber}
            </p>
          ) : gstStatus === "checking" ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner size={12} /> Checking availability…
            </p>
          ) : gstStatus === "available" ? (
            <p className="text-xs text-muted-foreground">GST number is available.</p>
          ) : gstStatus === "taken" ? (
            <p className="text-xs text-destructive">This GST number is already registered.</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || gstStatus === "checking" || gstStatus === "taken"}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Checking…" : "Continue"}
        </Button>

        <p className="text-center text-sm">
          <Link href={ROUTES.LOGIN} className="text-primary underline-offset-4 hover:underline">
            Already have an account? Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

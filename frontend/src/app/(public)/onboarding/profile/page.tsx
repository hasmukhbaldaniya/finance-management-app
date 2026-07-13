"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { AuthCard } from "@/components/auth-card";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updateOnboardingProfile } from "@/apis/employee-onboarding";
import type { EmployeeTitle } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidEmployeeName } from "@/utils/helpers/validation.helper";
import { useOnboarding } from "@/contexts/OnboardingContext";

const TITLES: EmployeeTitle[] = ["Mr", "Mrs", "Ms"];

type FieldErrors = {
  title?: string;
  firstName?: string;
  lastName?: string;
};

export default function OnboardingProfilePage() {
  const router = useRouter();
  const {
    token,
    title: contextTitle,
    firstName: contextFirstName,
    lastName: contextLastName,
    setTitle,
    setFirstName,
    setLastName,
  } = useOnboarding();

  const [title, setTitleInput] = useState<EmployeeTitle | "">(contextTitle);
  const [firstName, setFirstNameInput] = useState(contextFirstName);
  const [lastName, setLastNameInput] = useState(contextLastName);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace(ROUTES.LOGIN);
    }
  }, [token, router]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!title) {
      nextErrors.title = "Select a title.";
    }
    if (!isValidEmployeeName(firstName.trim())) {
      nextErrors.firstName = "First Name is required.";
    }
    if (!isValidEmployeeName(lastName.trim())) {
      nextErrors.lastName = "Last Name is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!validate() || !title) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateOnboardingProfile(token, title, firstName.trim(), lastName.trim());
      setTitle(title);
      setFirstName(firstName.trim());
      setLastName(lastName.trim());
      router.push(ROUTES.ONBOARDING.MOBILE);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <AuthCard title="Confirm your details" description="Review your name and title — you can change these if needed.">
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
        <Stack spacing={0.75}>
          <Label htmlFor="title">Title</Label>
          <SelectField
            id="title"
            value={title}
            onValueChange={(value) => setTitleInput(value as EmployeeTitle)}
            hasError={Boolean(errors.title)}
            placeholder="Select"
            options={TITLES.map((option) => ({ value: option, label: option }))}
          />
          {errors.title ? (
            <Typography variant="caption" color="error">
              {errors.title}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.75}>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstNameInput(event.target.value)}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
          />
          {errors.firstName ? (
            <Typography id="firstName-error" variant="caption" color="error">
              {errors.firstName}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.75}>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastNameInput(event.target.value)}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
          />
          {errors.lastName ? (
            <Typography id="lastName-error" variant="caption" color="error">
              {errors.lastName}
            </Typography>
          ) : null}
        </Stack>

        <Button type="submit" sx={{ width: "100%" }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Saving…" : "Continue"}
        </Button>
      </Stack>
    </AuthCard>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { register } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isEmail, isStrongPassword, isValidName } from "@/utils/helpers/validation.helper";
import { useRegistration } from "@/contexts/RegistrationContext";

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterDetailsPage() {
  const router = useRouter();
  const { organizationName, gstNumber, setEmail: setContextEmail } = useRegistration();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!organizationName || !gstNumber) {
      router.replace(ROUTES.REGISTER.ORGANIZATION);
    }
  }, [organizationName, gstNumber, router]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!isValidName(firstName.trim())) {
      nextErrors.firstName = "Enter a valid first name.";
    }
    if (!isValidName(lastName.trim())) {
      nextErrors.lastName = "Enter a valid last name.";
    }
    if (!isEmail(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!isStrongPassword(password)) {
      nextErrors.password =
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.";
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    setIsSubmitting(true);
    try {
      const { message } = await register({
        organizationName,
        gstNumber,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimmedEmail,
        password,
      });
      toast.success(message);
      setContextEmail(trimmedEmail);
      router.push(ROUTES.REGISTER.VERIFY_EMAIL);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
      if (err instanceof ApiError && err.status === 409 && message.includes("GST")) {
        router.push(ROUTES.REGISTER.ORGANIZATION);
      } else if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!organizationName || !gstNumber) {
    return null;
  }

  return (
    <AuthCard title="Personal details" description="Create your admin account for this organization.">
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
        <Stack spacing={0.75}>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
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
            onChange={(event) => setLastName(event.target.value)}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
          />
          {errors.lastName ? (
            <Typography id="lastName-error" variant="caption" color="error">
              {errors.lastName}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.75}>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <Typography id="email-error" variant="caption" color="error">
              {errors.email}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.75}>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password ? (
            <Typography id="password-error" variant="caption" color="error">
              {errors.password}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.75}>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          {errors.confirmPassword ? (
            <Typography id="confirmPassword-error" variant="caption" color="error">
              {errors.confirmPassword}
            </Typography>
          ) : null}
        </Stack>

        <Button type="submit" sx={{ width: "100%" }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Submitting…" : "Continue"}
        </Button>

        <Typography align="center" variant="body2">
          <MuiLink component={Link} href={ROUTES.REGISTER.ORGANIZATION} underline="hover">
            ← Back
          </MuiLink>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

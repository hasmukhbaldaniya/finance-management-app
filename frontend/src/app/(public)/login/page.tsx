"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
import { login } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidIdentifier } from "@/utils/helpers/validation.helper";

type FieldErrors = {
  identifier?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = "Email or phone number is required.";
    } else if (!isValidIdentifier(identifier.trim())) {
      nextErrors.identifier = "Enter a valid email address or India phone number.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      router.push(ROUTES.DASHBOARD);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Log in" description="Access your dashboard.">
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
        <Stack spacing={0.75}>
          <Label htmlFor="identifier">Email or Phone Number</Label>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? "identifier-error" : undefined}
          />
          {errors.identifier ? (
            <Typography id="identifier-error" variant="caption" color="error">
              {errors.identifier}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.75}>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
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

        <Button type="submit" sx={{ width: "100%" }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Logging in…" : "Login"}
        </Button>

        <Typography align="center" variant="body2">
          <MuiLink component={Link} href={ROUTES.FORGOT_PASSWORD.REQUEST} underline="hover">
            Forgot password?
          </MuiLink>
        </Typography>

        <Typography align="center" variant="body2">
          <MuiLink component={Link} href={ROUTES.REGISTER.ORGANIZATION} underline="hover">
            Register your company
          </MuiLink>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

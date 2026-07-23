"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { resetPassword } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isStrongPassword } from "@/utils/helpers/validation.helper";
import { useForgotPassword } from "@/contexts/ForgotPasswordContext";

type FieldErrors = {
  newPassword?: string;
  confirmPassword?: string;
};

export default function ForgotPasswordStep3Page() {
  const router = useRouter();
  const { resetToken, reset } = useForgotPassword();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (!resetToken && !isLeavingRef.current) {
      router.replace(ROUTES.FORGOT_PASSWORD.REQUEST);
    }
  }, [resetToken, router]);

  function leaveAndReset(): void {
    isLeavingRef.current = true;
    reset();
  }

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!isStrongPassword(newPassword)) {
      nextErrors.newPassword =
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.";
    }

    if (confirmPassword !== newPassword) {
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

    setIsSubmitting(true);
    try {
      const { message } = await resetPassword(resetToken, newPassword);
      toast.success(message);
      leaveAndReset();
      router.push(ROUTES.LOGIN);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
      if (err instanceof ApiError && err.status === 401) {
        leaveAndReset();
        router.push(ROUTES.FORGOT_PASSWORD.REQUEST);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!resetToken) {
    return null;
  }

  return (
    <AuthCard title="Reset password" description="Choose a new password for your account.">
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
        <Stack spacing={0.75}>
          <Label htmlFor="newPassword">New Password</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? "new-password-error" : undefined}
          />
          {errors.newPassword ? (
            <Typography id="new-password-error" variant="caption" color="error">
              {errors.newPassword}
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
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {errors.confirmPassword ? (
            <Typography id="confirm-password-error" variant="caption" color="error">
              {errors.confirmPassword}
            </Typography>
          ) : null}
        </Stack>

        <Button type="submit" sx={{ width: "100%" }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Submitting…" : "Submit"}
        </Button>

        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <MuiLink component={Link} href={ROUTES.FORGOT_PASSWORD.VERIFY} underline="hover" variant="body2">
            ← Back
          </MuiLink>
          <MuiLink component={Link} href={ROUTES.LOGIN} onClick={leaveAndReset} underline="hover" variant="body2">
            Back to Login
          </MuiLink>
        </Stack>
      </Stack>
    </AuthCard>
  );
}

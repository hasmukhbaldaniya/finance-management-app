"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
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

  useEffect(() => {
    if (!resetToken) {
      router.replace(ROUTES.FORGOT_PASSWORD.REQUEST);
    }
  }, [resetToken, router]);

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
      reset();
      router.push(ROUTES.LOGIN);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
      if (err instanceof ApiError && err.status === 401) {
        reset();
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
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
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
            <p id="new-password-error" className="text-xs text-destructive">
              {errors.newPassword}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
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
            <p id="confirm-password-error" className="text-xs text-destructive">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Submitting…" : "Submit"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link href={ROUTES.FORGOT_PASSWORD.VERIFY} className="text-primary underline-offset-4 hover:underline">
            ← Back
          </Link>
          <Link href={ROUTES.LOGIN} onClick={reset} className="text-primary underline-offset-4 hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

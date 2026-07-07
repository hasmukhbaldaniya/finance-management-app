"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { setOnboardingPassword, verifyOnboardingToken } from "@/apis/employee-onboarding";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isStrongPassword } from "@/utils/helpers/validation.helper";
import { useOnboarding } from "@/contexts/OnboardingContext";

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
};

function OnboardingVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token") ?? "";
  const { token, email, setToken, setEmail, setTitle, setFirstName, setLastName } = useOnboarding();

  const [isVerifying, setIsVerifying] = useState(true);
  const [linkError, setLinkError] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!queryToken) {
      setLinkError("This invitation link is missing its token. Please use the link from your invite email.");
      setIsVerifying(false);
      return;
    }

    let isCancelled = false;
    async function verify(): Promise<void> {
      try {
        const result = await verifyOnboardingToken(queryToken);
        if (isCancelled) return;
        setToken(queryToken);
        setEmail(result.email);
        setTitle(result.title ?? "");
        setFirstName(result.firstName ?? "");
        setLastName(result.lastName ?? "");
      } catch (err) {
        if (isCancelled) return;
        const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
        setLinkError(message);
      } finally {
        if (!isCancelled) setIsVerifying(false);
      }
    }
    verify();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryToken]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

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

    setIsSubmitting(true);
    try {
      await setOnboardingPassword(token, password);
      router.push(ROUTES.ONBOARDING.PROFILE);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isVerifying) {
    return (
      <AuthCard title="Verifying your invitation…" description="Please wait a moment.">
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      </AuthCard>
    );
  }

  if (linkError || !token) {
    return (
      <AuthCard title="Invitation link invalid">
        <p className="text-sm text-destructive">{linkError ?? GENERIC_ERROR_MESSAGE}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set your password" description="Confirm your email and choose a password to get started.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={email} disabled readOnly />
        </div>

        <div className="space-y-1.5">
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
            <p id="password-error" className="text-xs text-destructive">
              {errors.password}
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
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          {errors.confirmPassword ? (
            <p id="confirmPassword-error" className="text-xs text-destructive">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Verifying your invitation…" description="Please wait a moment.">
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        </AuthCard>
      }
    >
      <OnboardingVerifyPage />
    </Suspense>
  );
}

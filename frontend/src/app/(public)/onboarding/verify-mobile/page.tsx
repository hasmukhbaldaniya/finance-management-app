"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { completeOnboarding, sendOnboardingMobileOtp, verifyOnboardingMobileOtp } from "@/apis/employee-onboarding";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidOtp } from "@/utils/helpers/validation.helper";
import { useOnboarding } from "@/contexts/OnboardingContext";

const RESEND_COOLDOWN_SECONDS = 30;

type PendingAction = "skip" | "verify" | null;

export default function OnboardingVerifyMobilePage() {
  const router = useRouter();
  const { token, contactNumber } = useOnboarding();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!token || !contactNumber) {
      router.replace(ROUTES.LOGIN);
    }
  }, [token, contactNumber, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  async function finishAndRedirect(): Promise<void> {
    await completeOnboarding(token);
    router.push(ROUTES.DASHBOARD);
  }

  async function handleSkip(): Promise<void> {
    setPendingAction("skip");
    try {
      await finishAndRedirect();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleVerify(): Promise<void> {
    if (!isValidOtp(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setError(undefined);

    setPendingAction("verify");
    try {
      await verifyOnboardingMobileOtp(token, otp);
      await finishAndRedirect();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleResend(): Promise<void> {
    setIsResending(true);
    try {
      const { message } = await sendOnboardingMobileOtp(token);
      toast.success(message);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  }

  if (!token || !contactNumber) {
    return null;
  }

  const isBusy = pendingAction !== null;

  return (
    <AuthCard title="Verify your mobile number" description={`Enter the 6-digit code sent to ${contactNumber}.`}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="otp">OTP</Label>
          <Input
            id="otp"
            name="otp"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "otp-error" : undefined}
          />
          {error ? (
            <p id="otp-error" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={handleSkip} disabled={isBusy}>
            {pendingAction === "skip" ? <Spinner /> : null}
            Skip
          </Button>
          <Button type="button" className="flex-1" onClick={handleVerify} disabled={isBusy}>
            {pendingAction === "verify" ? <Spinner /> : null}
            Verify
          </Button>
        </div>

        <div className="text-center text-sm">
          {secondsLeft > 0 ? (
            <span className="text-muted-foreground">Resend OTP in {secondsLeft}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              {isResending ? <Spinner className="size-3.5" /> : null}
              {isResending ? "Resending…" : "Resend OTP"}
            </button>
          )}
        </div>

        <p className="text-center text-sm">
          <Link href={ROUTES.ONBOARDING.MOBILE} className="text-primary underline-offset-4 hover:underline">
            ← Change mobile number
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

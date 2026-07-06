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
import { completeRegistration, sendRegistrationMobileOtp, verifyRegistrationMobileOtp } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidOtp } from "@/utils/helpers/validation.helper";
import { useRegistration } from "@/contexts/RegistrationContext";

const RESEND_COOLDOWN_SECONDS = 30;

type PendingAction = "skip" | "save" | null;

export default function RegisterVerifyMobilePage() {
  const router = useRouter();
  const { registrationToken, mobileNumber } = useRegistration();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!registrationToken || !mobileNumber) {
      router.replace(ROUTES.REGISTER.ORGANIZATION);
    }
  }, [registrationToken, mobileNumber, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  async function finishAndRedirect(): Promise<void> {
    await completeRegistration(registrationToken);
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

  async function handleSave(): Promise<void> {
    if (!isValidOtp(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setError(undefined);

    setPendingAction("save");
    try {
      await verifyRegistrationMobileOtp(registrationToken, otp);
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
      const { message } = await sendRegistrationMobileOtp(registrationToken);
      toast.success(message);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  }

  if (!registrationToken || !mobileNumber) {
    return null;
  }

  const isBusy = pendingAction !== null;

  return (
    <AuthCard title="Verify your mobile number" description={`Enter the 6-digit code sent to ${mobileNumber}.`}>
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
          <Button type="button" className="flex-1" onClick={handleSave} disabled={isBusy}>
            {pendingAction === "save" ? <Spinner /> : null}
            Save
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
          <Link href={ROUTES.REGISTER.MOBILE} className="text-primary underline-offset-4 hover:underline">
            ← Change mobile number
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

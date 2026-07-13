"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
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
      <Stack spacing={2}>
        <Stack spacing={0.75}>
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
            <Typography id="otp-error" variant="caption" color="error">
              {error}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button type="button" variant="outline" sx={{ flex: 1 }} onClick={handleSkip} disabled={isBusy}>
            {pendingAction === "skip" ? <Spinner /> : null}
            Skip
          </Button>
          <Button type="button" sx={{ flex: 1 }} onClick={handleVerify} disabled={isBusy}>
            {pendingAction === "verify" ? <Spinner /> : null}
            Verify
          </Button>
        </Stack>

        <Typography align="center" variant="body2">
          {secondsLeft > 0 ? (
            <Typography component="span" variant="body2" color="text.secondary">
              Resend OTP in {secondsLeft}s
            </Typography>
          ) : (
            <Button type="button" variant="link" onClick={handleResend} disabled={isResending} sx={{ p: 0, minWidth: 0 }}>
              {isResending ? <Spinner size={14} /> : null}
              {isResending ? "Resending…" : "Resend OTP"}
            </Button>
          )}
        </Typography>

        <Typography align="center" variant="body2">
          <MuiLink component={Link} href={ROUTES.ONBOARDING.MOBILE} underline="hover">
            ← Change mobile number
          </MuiLink>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

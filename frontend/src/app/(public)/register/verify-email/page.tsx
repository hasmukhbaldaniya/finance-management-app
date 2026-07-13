"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { resendRegistrationEmailOtp, verifyRegistrationEmailOtp } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidOtp } from "@/utils/helpers/validation.helper";
import { useRegistration } from "@/contexts/RegistrationContext";

const RESEND_COOLDOWN_SECONDS = 30;

export default function RegisterVerifyEmailPage() {
  const router = useRouter();
  const { email, setRegistrationToken, reset } = useRegistration();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (!email && !isLeavingRef.current) {
      router.replace(ROUTES.REGISTER.ORGANIZATION);
    }
  }, [email, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  function startOver(): void {
    isLeavingRef.current = true;
    reset();
    router.push(ROUTES.REGISTER.ORGANIZATION);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!isValidOtp(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setError(undefined);

    setIsSubmitting(true);
    try {
      const { registrationToken } = await verifyRegistrationEmailOtp(email, otp);
      setRegistrationToken(registrationToken);
      router.push(ROUTES.REGISTER.MOBILE);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend(): Promise<void> {
    setIsResending(true);
    try {
      const { message } = await resendRegistrationEmailOtp(email);
      toast.success(message);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return null;
  }

  return (
    <AuthCard title="Verify your email" description={`Enter the 6-digit code sent to ${email}.`}>
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
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

        <Button type="submit" sx={{ width: "100%" }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Verifying…" : "Verify"}
        </Button>

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
          <Button type="button" variant="link" onClick={startOver} sx={{ p: 0, minWidth: 0 }}>
            Wrong email? Start over
          </Button>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

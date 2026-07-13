"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { requestOtp, verifyOtp } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidOtp } from "@/utils/helpers/validation.helper";
import { useForgotPassword } from "@/contexts/ForgotPasswordContext";

const RESEND_COOLDOWN_SECONDS = 30;

export default function ForgotPasswordStep2Page() {
  const router = useRouter();
  const { email, setResetToken, reset } = useForgotPassword();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (!email && !isLeavingRef.current) {
      router.replace(ROUTES.FORGOT_PASSWORD.REQUEST);
    }
  }, [email, router]);

  function leaveAndReset(): void {
    isLeavingRef.current = true;
    reset();
  }

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!isValidOtp(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setError(undefined);

    setIsSubmitting(true);
    try {
      const { resetToken } = await verifyOtp(email, otp);
      setResetToken(resetToken);
      router.push(ROUTES.FORGOT_PASSWORD.RESET);
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
      const { message } = await requestOtp(email);
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
    <AuthCard title="Verify OTP" description={`Enter the 6-digit code sent to ${email}.`}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Verifying…" : "Verify"}
        </Button>

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
              {isResending ? <Spinner size={14} /> : null}
              {isResending ? "Resending…" : "Resend OTP"}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link href={ROUTES.FORGOT_PASSWORD.REQUEST} className="text-primary underline-offset-4 hover:underline">
            ← Change email
          </Link>
          <Link href={ROUTES.LOGIN} onClick={leaveAndReset} className="text-primary underline-offset-4 hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

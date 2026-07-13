"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { requestOtp } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isEmail } from "@/utils/helpers/validation.helper";
import { useForgotPassword } from "@/contexts/ForgotPasswordContext";

export default function ForgotPasswordStep1Page() {
  const router = useRouter();
  const { email: contextEmail, setEmail: setContextEmail, reset } = useForgotPassword();
  const [email, setEmail] = useState(contextEmail);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!isEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);

    setIsSubmitting(true);
    try {
      const { message } = await requestOtp(trimmedEmail);
      toast.success(message);
      setContextEmail(trimmedEmail);
      router.push(ROUTES.FORGOT_PASSWORD.VERIFY);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Forgot password" description="Enter your email to receive a one-time password.">
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
        <Stack spacing={0.75}>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "email-error" : undefined}
          />
          {error ? (
            <Typography id="email-error" variant="caption" color="error">
              {error}
            </Typography>
          ) : null}
        </Stack>

        <Button type="submit" sx={{ width: "100%" }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Sending…" : "Submit"}
        </Button>

        <Typography align="center" variant="body2">
          <MuiLink component={Link} href={ROUTES.LOGIN} onClick={reset} underline="hover">
            Back to Login
          </MuiLink>
        </Typography>
      </Stack>
    </AuthCard>
  );
}

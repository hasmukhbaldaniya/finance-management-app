"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth-api";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/lib/api";
import { isValidIdentifier } from "@/lib/validation";

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
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Log in" description="Access your dashboard.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
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
            <p id="identifier-error" className="text-xs text-destructive">
              {errors.identifier}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
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
            <p id="password-error" className="text-xs text-destructive">
              {errors.password}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging in…" : "Login"}
        </Button>

        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { completeRegistration, sendRegistrationMobileOtp, setRegistrationMobile } from "@/apis/auth";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isPhone } from "@/utils/helpers/validation.helper";
import { useRegistration } from "@/contexts/RegistrationContext";

type SubmitAction = "skip" | "continue" | null;

export default function RegisterMobilePage() {
  const router = useRouter();
  const { registrationToken, mobileNumber: contextMobile, setMobileNumber } = useRegistration();
  const [mobileNumber, setMobileNumberInput] = useState(contextMobile);
  const [error, setError] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<SubmitAction>(null);

  useEffect(() => {
    if (!registrationToken) {
      router.replace(ROUTES.REGISTER.ORGANIZATION);
    }
  }, [registrationToken, router]);

  const isValidMobile = isPhone(mobileNumber.trim());

  async function saveMobile(): Promise<boolean> {
    try {
      await setRegistrationMobile(registrationToken, mobileNumber.trim());
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      setError(message);
      toast.error(message);
      return false;
    }
  }

  async function handleSkip(): Promise<void> {
    if (!isValidMobile) {
      setError("Enter a valid India mobile number.");
      return;
    }
    setError(undefined);

    setPendingAction("skip");
    try {
      const saved = await saveMobile();
      if (!saved) return;

      await completeRegistration(registrationToken);
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSaveAndContinue(): Promise<void> {
    if (!isValidMobile) {
      setError("Enter a valid India mobile number.");
      return;
    }
    setError(undefined);

    setPendingAction("continue");
    try {
      const saved = await saveMobile();
      if (!saved) return;

      const { message } = await sendRegistrationMobileOtp(registrationToken);
      toast.success(message);
      setMobileNumber(mobileNumber.trim());
      router.push(ROUTES.REGISTER.VERIFY_MOBILE);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  if (!registrationToken) {
    return null;
  }

  const isBusy = pendingAction !== null;

  return (
    <AuthCard title="Add your mobile number" description="Optional to verify now — you can always do this later.">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="mobileNumber">Mobile Number</Label>
          <Input
            id="mobileNumber"
            name="mobileNumber"
            inputMode="numeric"
            autoComplete="tel"
            value={mobileNumber}
            onChange={(event) => {
              setMobileNumberInput(event.target.value);
              setError(undefined);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "mobileNumber-error" : undefined}
          />
          {error ? (
            <p id="mobileNumber-error" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={handleSkip} disabled={!isValidMobile || isBusy}>
            {pendingAction === "skip" ? <Spinner /> : null}
            Skip
          </Button>
          <Button type="button" className="flex-1" onClick={handleSaveAndContinue} disabled={!isValidMobile || isBusy}>
            {pendingAction === "continue" ? <Spinner /> : null}
            Save &amp; Continue
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}

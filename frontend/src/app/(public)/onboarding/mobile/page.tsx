"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { completeOnboarding, sendOnboardingMobileOtp, setOnboardingMobile } from "@/apis/employee-onboarding";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { isValidContactNumber } from "@/utils/helpers/validation.helper";
import { useOnboarding } from "@/contexts/OnboardingContext";

type SubmitAction = "skip" | "continue" | null;

export default function OnboardingMobilePage() {
  const router = useRouter();
  const { token, countryCode, contactNumber: contextContactNumber, setContactNumber } = useOnboarding();
  const [contactNumber, setContactNumberInput] = useState(contextContactNumber);
  const [error, setError] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<SubmitAction>(null);

  useEffect(() => {
    if (!token) {
      router.replace(ROUTES.LOGIN);
    }
  }, [token, router]);

  const isValidNumber = isValidContactNumber(contactNumber.trim());

  async function saveMobile(): Promise<boolean> {
    try {
      await setOnboardingMobile(token, countryCode, contactNumber.trim());
      setContactNumber(contactNumber.trim());
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      setError(message);
      toast.error(message);
      return false;
    }
  }

  async function handleSkip(): Promise<void> {
    setPendingAction("skip");
    try {
      await completeOnboarding(token);
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleVerify(): Promise<void> {
    if (!isValidNumber) {
      setError("Enter a valid mobile number.");
      return;
    }
    setError(undefined);

    setPendingAction("continue");
    try {
      const saved = await saveMobile();
      if (!saved) return;

      const { message } = await sendOnboardingMobileOtp(token);
      toast.success(message);
      router.push(ROUTES.ONBOARDING.VERIFY_MOBILE);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  if (!token) {
    return null;
  }

  const isBusy = pendingAction !== null;

  return (
    <AuthCard title="Add your mobile number" description="Verify your mobile number now, or skip and do this later.">
      <Stack spacing={2}>
        <Stack spacing={0.75}>
          <Label htmlFor="contactNumber">Mobile Number</Label>
          <Input
            id="contactNumber"
            name="contactNumber"
            inputMode="numeric"
            autoComplete="tel"
            value={contactNumber}
            onChange={(event) => {
              setContactNumberInput(event.target.value);
              setError(undefined);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "contactNumber-error" : undefined}
          />
          {error ? (
            <Typography id="contactNumber-error" variant="caption" color="error">
              {error}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button type="button" variant="outline" sx={{ flex: 1 }} onClick={handleSkip} disabled={isBusy}>
            {pendingAction === "skip" ? <Spinner /> : null}
            Skip
          </Button>
          <Button type="button" sx={{ flex: 1 }} onClick={handleVerify} disabled={!isValidNumber || isBusy}>
            {pendingAction === "continue" ? <Spinner /> : null}
            Verify
          </Button>
        </Stack>
      </Stack>
    </AuthCard>
  );
}

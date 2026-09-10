// Ported from frontend/src/app/(public)/onboarding/layout.tsx.
// <Outlet/> stands in for Next's implicit `children`.
import { Outlet } from "react-router";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

export function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Outlet />
    </OnboardingProvider>
  );
}

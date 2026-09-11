"use client";

import { useContext } from "react";
import { OnboardingContext, type OnboardingState } from "./context";

export function useOnboarding(): OnboardingState {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

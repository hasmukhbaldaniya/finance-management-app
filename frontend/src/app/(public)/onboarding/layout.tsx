import type { ReactNode } from "react";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

type OnboardingLayoutProps = {
  children: ReactNode;
};

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}

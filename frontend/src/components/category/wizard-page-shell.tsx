import type { ReactNode } from "react";
import { WizardStepNav } from "./wizard-step-nav";
import type { CategoryWizardStep } from "@/types/category.type";

type WizardPageShellProps = {
  categoryId: number | null;
  currentStep: CategoryWizardStep;
  highestStepIndexReached: number;
  heading: string;
  children: ReactNode;
};

export function WizardPageShell({ categoryId, currentStep, highestStepIndexReached, heading, children }: WizardPageShellProps) {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8 md:flex-row md:gap-10">
      <WizardStepNav categoryId={categoryId} currentStep={currentStep} highestStepIndexReached={highestStepIndexReached} />
      <div className="min-w-0 flex-1 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        {children}
      </div>
    </div>
  );
}

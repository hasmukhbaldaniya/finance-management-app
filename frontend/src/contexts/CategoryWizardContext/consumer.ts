"use client";

import { useContext } from "react";
import { CategoryWizardContext, type CategoryWizardState } from "./context";

export function useCategoryWizard(): CategoryWizardState {
  const context = useContext(CategoryWizardContext);
  if (!context) {
    throw new Error("useCategoryWizard must be used within a CategoryWizardProvider");
  }
  return context;
}

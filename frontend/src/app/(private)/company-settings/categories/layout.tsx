import type { ReactNode } from "react";
import { CategoryWizardProvider } from "@/contexts/CategoryWizardContext";

type CategoriesLayoutProps = {
  children: ReactNode;
};

// Wraps the listing, the create/duplicate entry point, and every [id]/* wizard
// step under one provider so in-memory wizard state (e.g. a Duplicate's
// copied field/policy data) survives the client-side navigation from
// /new straight into /[id]/expense-form once Step 1's POST returns an id.
export default function CategoriesLayout({ children }: CategoriesLayoutProps) {
  return <CategoryWizardProvider>{children}</CategoryWizardProvider>;
}

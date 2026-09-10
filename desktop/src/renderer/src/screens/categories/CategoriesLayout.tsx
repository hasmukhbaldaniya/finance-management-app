// Ported from frontend/src/app/(private)/company-settings/categories/layout.tsx.
// Wraps the listing, the create/duplicate entry point, and every :id/* wizard
// step under one provider so in-memory wizard state (e.g. a Duplicate's
// copied field/policy data) survives client-side navigation from /new
// straight into /:id/expense-form once Step 1's POST returns an id.
// <Outlet/> stands in for Next's implicit `children`.
import { Outlet } from "react-router";
import { CategoryWizardProvider } from "@/contexts/CategoryWizardContext";

export function CategoriesLayout() {
  return (
    <CategoryWizardProvider>
      <Outlet />
    </CategoryWizardProvider>
  );
}

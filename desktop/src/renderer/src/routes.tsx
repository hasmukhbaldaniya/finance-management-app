// Hand-written route config mirroring frontend/src/app's file-based tree —
// there's no Vite equivalent of Next's App Router, so this is the one file
// that stands in for that whole directory structure. Nested <Route>s with
// an element rendering <Outlet/> replace Next's nested layout.tsx files.
//
// Only Login + Forgot Password (Phase 5) and a Dashboard placeholder are
// real so far; every other private route is a ComingSoon placeholder until
// its own phase (see the plan) ports the real screen — same content
// frontend/ itself still shows for Approvals/Finance today, just borrowed
// here for routes this app hasn't built yet either.
import { Navigate, Outlet, Route, Routes } from "react-router";
import { ComingSoon } from "@/components/coming-soon";
import { ROUTES } from "@/utils/constants/route.constant";
import { LoginLayout } from "@/screens/auth/LoginLayout";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { ForgotPasswordLayout } from "@/screens/forgot-password/ForgotPasswordLayout";
import { ForgotPasswordRequestStep } from "@/screens/forgot-password/RequestStep";
import { ForgotPasswordVerifyStep } from "@/screens/forgot-password/VerifyStep";
import { ForgotPasswordResetStep } from "@/screens/forgot-password/ResetStep";
import { PrivateLayout } from "@/screens/private/PrivateLayout";
import { DashboardScreen } from "@/screens/dashboard/DashboardScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { HelpScreen } from "@/screens/help/HelpScreen";
import { GradesScreen } from "@/screens/company-settings/GradesScreen";
import { DepartmentsScreen } from "@/screens/company-settings/DepartmentsScreen";
import { RolesPrivilegesScreen } from "@/screens/company-settings/RolesPrivilegesScreen";
import { AssociatedOrganizationsScreen } from "@/screens/company-settings/AssociatedOrganizationsScreen";
import { EmployeesListScreen } from "@/screens/employees/EmployeesListScreen";
import { EmployeeInviteScreen } from "@/screens/employees/EmployeeInviteScreen";
import { EmployeeBulkInviteScreen } from "@/screens/employees/EmployeeBulkInviteScreen";
import { EmployeeEditScreen } from "@/screens/employees/EmployeeEditScreen";
import { CategoriesLayout } from "@/screens/categories/CategoriesLayout";
import { CategoriesListScreen } from "@/screens/categories/CategoriesListScreen";
import { CategoryNewScreen } from "@/screens/categories/CategoryNewScreen";
import { CategoryDetailsScreen } from "@/screens/categories/CategoryDetailsScreen";
import { CategoryBasicDetailsStepScreen } from "@/screens/categories/CategoryBasicDetailsStepScreen";
import { CategoryExpenseFormStepScreen } from "@/screens/categories/CategoryExpenseFormStepScreen";
import { CategoryPoliciesStepScreen } from "@/screens/categories/CategoryPoliciesStepScreen";
import { CategoryProjectPoliciesStepScreen } from "@/screens/categories/CategoryProjectPoliciesStepScreen";
import { TripsListScreen } from "@/screens/trips/TripsListScreen";
import { TripNewScreen } from "@/screens/trips/TripNewScreen";
import { TripDetailsScreen } from "@/screens/trips/TripDetailsScreen";
import { TripEditScreen } from "@/screens/trips/TripEditScreen";
import { ClaimsListScreen } from "@/screens/claims/ClaimsListScreen";
import { ClaimNewEntryScreen } from "@/screens/claims/ClaimNewEntryScreen";
import { ClaimNewManualScreen } from "@/screens/claims/ClaimNewManualScreen";
import { ClaimNewAiScreen } from "@/screens/claims/ClaimNewAiScreen";
import { ClaimManualEditScreen } from "@/screens/claims/ClaimManualEditScreen";
import { ClaimAiReviewScreen } from "@/screens/claims/ClaimAiReviewScreen";
import { SplitRequestDetailsScreen } from "@/screens/claims/SplitRequestDetailsScreen";
import { RegisterLayout } from "@/screens/register/RegisterLayout";
import { RegisterOrganizationScreen } from "@/screens/register/RegisterOrganizationScreen";
import { RegisterDetailsScreen } from "@/screens/register/RegisterDetailsScreen";
import { RegisterVerifyEmailScreen } from "@/screens/register/RegisterVerifyEmailScreen";
import { RegisterMobileScreen } from "@/screens/register/RegisterMobileScreen";
import { RegisterVerifyMobileScreen } from "@/screens/register/RegisterVerifyMobileScreen";
import { OnboardingLayout } from "@/screens/onboarding/OnboardingLayout";
import { OnboardingVerifyScreen } from "@/screens/onboarding/OnboardingVerifyScreen";
import { OnboardingProfileScreen } from "@/screens/onboarding/OnboardingProfileScreen";
import { OnboardingMobileScreen } from "@/screens/onboarding/OnboardingMobileScreen";
import { OnboardingVerifyMobileScreen } from "@/screens/onboarding/OnboardingVerifyMobileScreen";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

      <Route
        path={ROUTES.LOGIN}
        element={
          <LoginLayout>
            <LoginScreen />
          </LoginLayout>
        }
      />

      <Route element={<RegisterLayout />}>
        <Route path={ROUTES.REGISTER.ORGANIZATION} element={<RegisterOrganizationScreen />} />
        <Route path={ROUTES.REGISTER.DETAILS} element={<RegisterDetailsScreen />} />
        <Route path={ROUTES.REGISTER.VERIFY_EMAIL} element={<RegisterVerifyEmailScreen />} />
        <Route path={ROUTES.REGISTER.MOBILE} element={<RegisterMobileScreen />} />
        <Route path={ROUTES.REGISTER.VERIFY_MOBILE} element={<RegisterVerifyMobileScreen />} />
      </Route>

      <Route element={<OnboardingLayout />}>
        <Route path={ROUTES.ONBOARDING.VERIFY} element={<OnboardingVerifyScreen />} />
        <Route path={ROUTES.ONBOARDING.PROFILE} element={<OnboardingProfileScreen />} />
        <Route path={ROUTES.ONBOARDING.MOBILE} element={<OnboardingMobileScreen />} />
        <Route path={ROUTES.ONBOARDING.VERIFY_MOBILE} element={<OnboardingVerifyMobileScreen />} />
      </Route>

      <Route
        element={
          <ForgotPasswordLayout>
            <Outlet />
          </ForgotPasswordLayout>
        }
      >
        <Route path={ROUTES.FORGOT_PASSWORD.REQUEST} element={<ForgotPasswordRequestStep />} />
        <Route path={ROUTES.FORGOT_PASSWORD.VERIFY} element={<ForgotPasswordVerifyStep />} />
        <Route path={ROUTES.FORGOT_PASSWORD.RESET} element={<ForgotPasswordResetStep />} />
      </Route>

      <Route element={<PrivateLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardScreen />} />
        <Route path={ROUTES.TRIPS} element={<TripsListScreen />} />
        <Route path={ROUTES.TRIP_NEW} element={<TripNewScreen />} />
        <Route path="/trips/:id" element={<TripDetailsScreen />} />
        <Route path="/trips/:id/edit" element={<TripEditScreen />} />
        <Route path={ROUTES.CLAIMS} element={<ClaimsListScreen />} />
        <Route path={ROUTES.CLAIM_NEW} element={<ClaimNewEntryScreen />} />
        <Route path={ROUTES.CLAIM_NEW_MANUAL} element={<ClaimNewManualScreen />} />
        <Route path={ROUTES.CLAIM_NEW_AI} element={<ClaimNewAiScreen />} />
        <Route path="/claims/:id/manual" element={<ClaimManualEditScreen />} />
        <Route path="/claims/:id/ai-review" element={<ClaimAiReviewScreen />} />
        <Route path="/claims/split-requests/:id" element={<SplitRequestDetailsScreen />} />
        <Route path={ROUTES.APPROVALS} element={<ComingSoon title="Approvals" />} />
        <Route path={ROUTES.FINANCE} element={<ComingSoon title="Finance" />} />
        <Route path={ROUTES.HELP} element={<HelpScreen />} />
        <Route path={ROUTES.PROFILE} element={<ProfileScreen />} />
        <Route path={ROUTES.COMPANY_SETTINGS.EMPLOYEES} element={<EmployeesListScreen />} />
        <Route path={ROUTES.EMPLOYEE_INVITE} element={<EmployeeInviteScreen />} />
        <Route path={ROUTES.EMPLOYEE_BULK_INVITE} element={<EmployeeBulkInviteScreen />} />
        <Route path="/company-settings/employees/:id/edit" element={<EmployeeEditScreen />} />
        <Route element={<CategoriesLayout />}>
          <Route path={ROUTES.COMPANY_SETTINGS.CATEGORIES} element={<CategoriesListScreen />} />
          <Route path={ROUTES.CATEGORY_NEW} element={<CategoryNewScreen />} />
          <Route path="/company-settings/categories/:id" element={<CategoryDetailsScreen />} />
          <Route path="/company-settings/categories/:id/basic-details" element={<CategoryBasicDetailsStepScreen />} />
          <Route path="/company-settings/categories/:id/expense-form" element={<CategoryExpenseFormStepScreen />} />
          <Route path="/company-settings/categories/:id/policies" element={<CategoryPoliciesStepScreen />} />
          <Route path="/company-settings/categories/:id/project-policies" element={<CategoryProjectPoliciesStepScreen />} />
        </Route>
        <Route path={ROUTES.COMPANY_SETTINGS.ROLES_PRIVILEGES} element={<RolesPrivilegesScreen />} />
        <Route path={ROUTES.COMPANY_SETTINGS.GRADES} element={<GradesScreen />} />
        <Route path={ROUTES.COMPANY_SETTINGS.DEPARTMENTS} element={<DepartmentsScreen />} />
        <Route path={ROUTES.COMPANY_SETTINGS.ASSOCIATED_ORGANIZATIONS} element={<AssociatedOrganizationsScreen />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}

import { Router } from "express";
import {
  completeOnboarding,
  sendOnboardingMobileOtp,
  setOnboardingMobile,
  setOnboardingPassword,
  updateOnboardingProfile,
  verifyOnboardingMobileOtp,
  verifyOnboardingTokenHandler,
} from "../controllers/employee-onboarding.controller";

// Deliberately NOT mounted under employeeRouter (/employees) — that router
// has a blanket requireAuth applied to it, and these endpoints run before
// the invited employee has any session at all. Mounted at its own top-level
// path instead, matching how /auth/registrations stays public precisely
// because it's a sub-router of authRouter, which has no such blanket gate.
export const employeeOnboardingRouter = Router();

employeeOnboardingRouter.post("/verify-token", verifyOnboardingTokenHandler);
employeeOnboardingRouter.post("/password", setOnboardingPassword);
employeeOnboardingRouter.post("/profile", updateOnboardingProfile);
employeeOnboardingRouter.put("/mobile", setOnboardingMobile);
employeeOnboardingRouter.post("/mobile-otp", sendOnboardingMobileOtp);
employeeOnboardingRouter.post("/mobile-otp/verify", verifyOnboardingMobileOtp);
employeeOnboardingRouter.post("/complete", completeOnboarding);

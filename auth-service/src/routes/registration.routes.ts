import { Router } from "express";
import {
  completeRegistration,
  createRegistration,
  resendRegistrationEmailOtp,
  sendRegistrationMobileOtp,
  setRegistrationMobile,
  verifyRegistrationEmailOtp,
  verifyRegistrationMobileOtp,
} from "../controllers/registration.controller";

export const registrationRouter = Router();

registrationRouter.post("/", createRegistration);
registrationRouter.post("/email-otp/resend", resendRegistrationEmailOtp);
registrationRouter.post("/email-otp/verify", verifyRegistrationEmailOtp);
registrationRouter.put("/mobile", setRegistrationMobile);
registrationRouter.post("/mobile-otp", sendRegistrationMobileOtp);
registrationRouter.post("/mobile-otp/verify", verifyRegistrationMobileOtp);
registrationRouter.post("/complete", completeRegistration);

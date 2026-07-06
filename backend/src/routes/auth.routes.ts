import { Router } from "express";
import { login, logout, me, requestOtp, resetPassword, verifyOtpHandler } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/require-auth";
import { registrationRouter } from "./registration.routes";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
authRouter.post("/forgot-password/request-otp", requestOtp);
authRouter.post("/forgot-password/verify-otp", verifyOtpHandler);
authRouter.post("/forgot-password/reset-password", resetPassword);
authRouter.use("/registrations", registrationRouter);

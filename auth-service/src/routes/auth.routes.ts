import { Router } from "express";
import { changePassword, login, logout, me, refresh, requestOtp, resetPassword, verifyOtpHandler } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/require-auth";
import { registrationRouter } from "./registration.routes";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/logout", logout);
// No requireAuth here, deliberately — the whole point is redeeming a
// refresh cookie once the access token has already expired.
authRouter.post("/refresh", refresh);
authRouter.get("/me", requireAuth, me);
authRouter.patch("/me/password", requireAuth, changePassword);
authRouter.post("/forgot-password/request-otp", requestOtp);
authRouter.post("/forgot-password/verify-otp", verifyOtpHandler);
authRouter.post("/forgot-password/reset-password", resetPassword);
authRouter.use("/registrations", registrationRouter);

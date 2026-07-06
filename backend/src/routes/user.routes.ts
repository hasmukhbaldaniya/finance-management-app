import { Router } from "express";
import { switchActiveOrganization } from "../controllers/user.controller";
import { requireAuth } from "../middleware/require-auth";

export const userRouter = Router();

userRouter.patch("/me/active-organization", requireAuth, switchActiveOrganization);

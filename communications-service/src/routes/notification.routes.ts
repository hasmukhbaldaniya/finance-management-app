import { Router } from "express";
import { sendEmailNotification, sendWhatsAppNotification } from "../controllers/notification.controller";
import { requireInternalAuth } from "../middleware/require-internal-auth";

export const notificationRouter = Router();

notificationRouter.use(requireInternalAuth);
notificationRouter.post("/email", sendEmailNotification);
notificationRouter.post("/whatsapp", sendWhatsAppNotification);

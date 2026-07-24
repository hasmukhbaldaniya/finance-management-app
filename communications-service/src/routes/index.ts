import { Router } from "express";
import { healthRouter } from "./health.routes";
import { notificationRouter } from "./notification.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/notifications", notificationRouter);

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestId } from "./middleware/request-id";
import { healthRouter } from "./routes/health.routes";
import { reportsRouter } from "./routes/reports.routes";

morgan.token("id", (req: express.Request & { requestId?: string }) => req.requestId ?? "-");

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(requestId);
  app.use(
    morgan(
      env.nodeEnv === "development"
        ? ":id :method :url :status :response-time ms - :res[content-length]"
        : ':id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    )
  );
  app.use(cookieParser());

  app.use("/health", healthRouter);
  app.use("/api/reports", reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

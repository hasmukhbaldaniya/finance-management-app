import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiRouter } from "./routes";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  // A base64-encoded invoice (up to 10MB per the backend's own upload cap)
  // runs ~33% larger encoded — well past express's 100kb default JSON limit.
  app.use(express.json({ limit: "20mb" }));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

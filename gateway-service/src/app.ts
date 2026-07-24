import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { healthRouter } from "./routes/health.routes";
import { AUTH_SERVICE_PATHS, CLAIM_SERVICE_PATHS, REPORTS_SERVICE_PATHS } from "./routes/proxy-routes";

// Exact-prefix match (not a plain startsWith) so "/api/employees" doesn't
// also swallow a hypothetical "/api/employees-export" route.
function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  app.use("/health", healthRouter);

  // Thin routing layer only (docs/PLANS/microservices-frontend-integration-plan.md,
  // section 1.0) — deliberately no express.json()/body-parsing here. Parsing the
  // body before proxying would consume the request stream, so each downstream
  // service parses its own body exactly as it does when called directly; the
  // gateway only forwards bytes, headers, and cookies unchanged.
  //
  // Mounted at the root (not via app.use(prefix, proxy)) and matched manually
  // via req.path instead, so Express never strips the prefix before the proxy
  // sees it — the whole point of this gateway is that paths never change.
  const authProxy = createProxyMiddleware({ target: env.authServiceUrl, changeOrigin: true });
  const claimProxy = createProxyMiddleware({ target: env.claimServiceUrl, changeOrigin: true });
  const reportsProxy = createProxyMiddleware({ target: env.reportsServiceUrl, changeOrigin: true });

  app.use((req, res, next) => {
    if (matchesPrefix(req.path, AUTH_SERVICE_PATHS)) {
      authProxy(req, res, next);
      return;
    }
    if (matchesPrefix(req.path, CLAIM_SERVICE_PATHS)) {
      claimProxy(req, res, next);
      return;
    }
    if (matchesPrefix(req.path, REPORTS_SERVICE_PATHS)) {
      reportsProxy(req, res, next);
      return;
    }
    next();
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

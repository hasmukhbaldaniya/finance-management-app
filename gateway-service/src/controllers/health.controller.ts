import type { Request, Response } from "express";
import { env } from "../config/env";

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}

const UPSTREAM_CHECK_TIMEOUT_MS = 3_000;

const UPSTREAMS = [
  { name: "auth", url: `${env.authServiceUrl}/api/health` },
  { name: "claim", url: `${env.claimServiceUrl}/api/health` },
  { name: "reports", url: `${env.reportsServiceUrl}/health` },
] as const;

async function checkUpstream(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_CHECK_TIMEOUT_MS) });
    return response.ok;
  } catch {
    return false;
  }
}

// Deliberately a separate endpoint from getHealth (liveness) — this is a
// readiness check. Liveness must stay a pure self-check with no external
// dependencies: if it started probing upstreams and one was briefly slow,
// an orchestrator using it would restart a perfectly healthy gateway
// process for a problem that lives elsewhere. Readiness is the right place
// to say "up, but not able to actually serve traffic right now" without
// killing the process over it.
export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const results = await Promise.all(UPSTREAMS.map(async ({ name, url }) => [name, await checkUpstream(url)] as const));
  const upstreams = Object.fromEntries(results.map(([name, ok]) => [name, ok ? "ok" : "down"]));
  const allOk = results.every(([, ok]) => ok);

  res.status(allOk ? 200 : 503).json({ status: allOk ? "ready" : "not-ready", upstreams });
}

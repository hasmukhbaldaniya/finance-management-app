import type { Request, Response } from "express";
import { env } from "../config/env";

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString(), aiConfigured: Boolean(env.anthropicApiKey) });
}

import type { Request, Response } from "express";
import mongoose from "mongoose";

export function getHealth(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    mongoConnected: mongoose.connection.readyState === 1,
  });
}

import type { Request, Response } from "express";
import { Organization } from "../models";
import { isValidGstNumber } from "../utils/validation";

export async function getGstAvailability(req: Request, res: Response): Promise<void> {
  const gstNumber = typeof req.query.gstNumber === "string" ? req.query.gstNumber.trim().toUpperCase() : "";

  if (!isValidGstNumber(gstNumber)) {
    res.status(400).json({ error: "Enter a valid GST number." });
    return;
  }

  const existing = await Organization.findOne({ where: { gstNumber } });
  res.status(200).json({ available: !existing });
}

import type { Request, Response } from "express";
import { Airline } from "../models";

export async function listAirlines(_req: Request, res: Response): Promise<void> {
  const airlines = await Airline.findAll({ order: [["name", "ASC"]] });
  res.status(200).json({ airlines: airlines.map((airline) => ({ id: airline.id, name: airline.name })) });
}

import type { Request, Response } from "express";
import { Country } from "../models";

export async function listCountries(_req: Request, res: Response): Promise<void> {
  const countries = await Country.findAll({ order: [["name", "ASC"]] });
  res.status(200).json({ countries: countries.map((country) => ({ id: country.id, name: country.name, code: country.code })) });
}

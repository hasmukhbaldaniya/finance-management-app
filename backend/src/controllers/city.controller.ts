import type { Request, Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import { City, Country } from "../models";

const MAX_RESULTS = 50;

// Backs Start/End Location's searchable dropdown (018's Create Trip) —
// matches by city name (and, per 018's own Validation Rules, country name
// too, so searching "India" surfaces every Indian city).
export async function listCities(req: Request, res: Response): Promise<void> {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const countryId = req.query.countryId ? Number(req.query.countryId) : null;
  // Exact-id lookup — Claim Management's city_list fields (022) store real
  // City ids as their value; resolving a saved id back to a display name
  // (e.g. re-opening a draft expense) needs an exact match, not a text
  // search, so this is a distinct filter from `search` below, not folded
  // into it.
  const ids = typeof req.query.ids === "string" && req.query.ids ? req.query.ids.split(",").map(Number).filter(Number.isFinite) : null;

  const conditions: WhereOptions[] = [];
  if (countryId) conditions.push({ countryId });
  if (ids && ids.length > 0) conditions.push({ id: ids });

  if (search) {
    const matchingCountries = await Country.findAll({ where: { name: { [Op.iLike]: `%${search}%` } } });
    const matchingCountryIds = matchingCountries.map((country) => country.id);
    conditions.push({
      [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, ...(matchingCountryIds.length > 0 ? [{ countryId: matchingCountryIds }] : [])],
    });
  }

  const cities = await City.findAll({
    where: conditions.length > 0 ? { [Op.and]: conditions } : undefined,
    order: [["name", "ASC"]],
    limit: MAX_RESULTS,
  });
  const countries = await Country.findAll({ where: { id: cities.map((city) => city.countryId) } });
  const countryNameById = new Map(countries.map((country) => [country.id, country.name]));

  res.status(200).json({
    cities: cities.map((city) => ({
      id: city.id,
      name: city.name,
      countryId: city.countryId,
      countryName: countryNameById.get(city.countryId) ?? "",
    })),
  });
}

import type { Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { City, Country, Trip, type TripStatus } from "../models";
import { getActiveOrganizationId } from "../utils/auth";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_TRIP_NAME_LENGTH, MIN_TRIP_NAME_LENGTH, TRIP_STATUSES } from "../utils/constants/trip.constant";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const TRIP_NOT_FOUND_MESSAGE = "Trip not found.";
// 020's own Error/Toast Messages table specifies this exact wording for its
// GET /api/trips/:id — deliberately distinct from deleteTrip's own message.
const TRIP_DETAIL_NOT_FOUND_MESSAGE = "This trip could not be found.";
const VALID_STATUSES = new Set<string>(TRIP_STATUSES);

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// 018's Create Trip — validates every field, persists with status "new" and
// totalAmount 0.00. See trip.model.ts's doc comment for why "draft" isn't a
// value this handler ever writes, despite being a real column value
// elsewhere (019's Open Questions covers the still-unresolved gap).
export async function createTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (name.length < MIN_TRIP_NAME_LENGTH || name.length > MAX_TRIP_NAME_LENGTH) {
    res.status(400).json({ error: "Trip Name is required." });
    return;
  }

  const startAt = asDate(req.body?.startAt);
  if (!startAt) {
    res.status(400).json({ error: "Start Date & Time is required." });
    return;
  }
  const endAt = asDate(req.body?.endAt);
  if (!endAt) {
    res.status(400).json({ error: "End Date & Time is required." });
    return;
  }
  if (endAt.getTime() <= startAt.getTime()) {
    res.status(400).json({ error: "End Date & Time must be after the Start Date & Time." });
    return;
  }

  const startCityId = Number(req.body?.startCityId);
  if (!startCityId) {
    res.status(400).json({ error: "Start Location is required." });
    return;
  }
  const endCityId = Number(req.body?.endCityId);
  if (!endCityId) {
    res.status(400).json({ error: "End Location is required." });
    return;
  }

  const cities = await City.findAll({ where: { id: [startCityId, endCityId] } });
  if (!cities.some((city) => city.id === startCityId) || !cities.some((city) => city.id === endCityId)) {
    res.status(404).json({ error: "Select a valid location." });
    return;
  }

  const trip = await Trip.create({
    organizationId,
    employeeId: req.userId,
    name,
    startAt,
    endAt,
    startCityId,
    endCityId,
    approvedAmount: null,
  });

  res.status(201).json({ id: trip.id, status: trip.status, totalAmount: trip.totalAmount });
}

function dayRange(value: string): { start: Date; end: Date } | null {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// 019's "My Trips" listing — search + three filters (trip start date,
// created date, status), infinite-scroll pagination, only the caller's own
// trips.
export async function listTrips(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));

  const conditions: WhereOptions[] = [{ employeeId: req.userId }];

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search) {
    const numericId = /^#?\d+$/.test(search) ? Number(search.replace("#", "")) : null;
    conditions.push({
      [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, ...(numericId !== null ? [{ id: numericId }] : [])],
    });
  }

  if (typeof req.query.tripStartDate === "string" && req.query.tripStartDate) {
    const range = dayRange(req.query.tripStartDate);
    if (range) conditions.push({ startAt: { [Op.gte]: range.start, [Op.lt]: range.end } });
  }
  if (typeof req.query.createdDate === "string" && req.query.createdDate) {
    const range = dayRange(req.query.createdDate);
    if (range) conditions.push({ createdAt: { [Op.gte]: range.start, [Op.lt]: range.end } });
  }
  if (typeof req.query.status === "string" && VALID_STATUSES.has(req.query.status)) {
    conditions.push({ status: req.query.status as TripStatus });
  }

  const { rows, count } = await Trip.findAndCountAll({
    where: { [Op.and]: conditions },
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  res.status(200).json({
    trips: rows.map((trip) => ({
      id: trip.id,
      name: trip.name,
      status: trip.status,
      createdAt: trip.createdAt,
      startAt: trip.startAt,
      endAt: trip.endAt,
      totalAmount: trip.totalAmount,
      approvedAmount: trip.approvedAmount,
    })),
    hasMore: page * pageSize < count,
  });
}

// 020's Trip Details — one endpoint returning everything the page needs,
// including startCity/endCity as objects (not bare ids), so the page never
// needs a second round-trip to GET /api/cities just to show a name/flag —
// the same "one endpoint, everything it needs" posture 013's shared
// category-detail endpoint already established.
export async function getTripDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const trip = await Trip.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!trip) {
    res.status(404).json({ error: TRIP_DETAIL_NOT_FOUND_MESSAGE });
    return;
  }

  const cities = await City.findAll({ where: { id: [trip.startCityId, trip.endCityId] } });
  const countries = await Country.findAll({ where: { id: cities.map((city) => city.countryId) } });
  const countryById = new Map(countries.map((country) => [country.id, country]));

  function cityPayload(cityId: number) {
    const city = cities.find((candidate) => candidate.id === cityId);
    const country = city ? countryById.get(city.countryId) : undefined;
    return { name: city?.name ?? "", countryName: country?.name ?? "", countryCode: country?.code ?? "" };
  }

  res.status(200).json({
    trip: {
      id: trip.id,
      name: trip.name,
      status: trip.status,
      createdAt: trip.createdAt,
      startAt: trip.startAt,
      endAt: trip.endAt,
      startCity: cityPayload(trip.startCityId),
      endCity: cityPayload(trip.endCityId),
      totalAmount: trip.totalAmount,
      approvedAmount: trip.approvedAmount,
    },
  });
}

// 019's Delete a Draft Trip — draft-only, enforced here, not just hidden
// client-side, same posture as Category Listing's own draft-only delete.
export async function deleteTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const trip = await Trip.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!trip) {
    res.status(404).json({ error: TRIP_NOT_FOUND_MESSAGE });
    return;
  }
  if (trip.status !== "draft") {
    res.status(409).json({ error: "Only draft trips can be deleted." });
    return;
  }

  await trip.destroy();
  res.status(200).json({ message: "Trip deleted." });
}

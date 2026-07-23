import type { Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Category, City, Claim, Country, Expense, Trip, type TripStatus } from "../models";
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

type ValidatedTripInput = {
  name: string;
  startAt: Date;
  endAt: Date;
  startCityId: number;
  endCityId: number;
};

// Shared between createTrip and updateTrip (021's Edit Trip reuses 018's
// Create Trip validation verbatim, per that story's own Validation Rules).
// `status` on the error branch defaults to 400 at the call site — only the
// city-existence check below overrides it to 404, per 018's own API Design
// table ("400 (validation failures)... 404 (a referenced startCityId/
// endCityId doesn't exist)").
async function parseAndValidateTripInput(body: unknown): Promise<{ error: string; status?: number } | ValidatedTripInput> {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) {
    return { error: "Trip Name is required." };
  }
  if (name.length < MIN_TRIP_NAME_LENGTH || name.length > MAX_TRIP_NAME_LENGTH) {
    return { error: `Trip Name must be between ${MIN_TRIP_NAME_LENGTH} and ${MAX_TRIP_NAME_LENGTH} characters.` };
  }

  const startAt = asDate(record.startAt);
  if (!startAt) {
    return { error: "Start Date & Time is required." };
  }
  const endAt = asDate(record.endAt);
  if (!endAt) {
    return { error: "End Date & Time is required." };
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return { error: "End Date & Time must be after the Start Date & Time." };
  }

  const startCityId = Number(record.startCityId);
  if (!startCityId) {
    return { error: "Start Location is required." };
  }
  const endCityId = Number(record.endCityId);
  if (!endCityId) {
    return { error: "End Location is required." };
  }

  const cities = await City.findAll({ where: { id: [startCityId, endCityId] } });
  if (!cities.some((city) => city.id === startCityId) || !cities.some((city) => city.id === endCityId)) {
    return { error: "Select a valid location.", status: 404 };
  }

  return { name, startAt, endAt, startCityId, endCityId };
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

  const parsed = await parseAndValidateTripInput(req.body);
  if ("error" in parsed) {
    res.status(parsed.status ?? 400).json({ error: parsed.error });
    return;
  }

  const trip = await Trip.create({
    organizationId,
    employeeId: req.userId,
    name: parsed.name,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
    startCityId: parsed.startCityId,
    endCityId: parsed.endCityId,
    approvedAmount: null,
  });

  res.status(201).json({ id: trip.id, status: trip.status, totalAmount: trip.totalAmount });
}

// 021's Edit Trip — identical validation to createTrip, but updates the
// existing row in place and is only ever allowed while status is "new",
// enforced here (not just by the frontend disabling the Edit button) so a
// stale client-side "enabled" state from before the status changed doesn't
// get a free pass — see 021's own Edge Cases.
export async function updateTrip(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const trip = await Trip.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!trip) {
    res.status(404).json({ error: TRIP_NOT_FOUND_MESSAGE });
    return;
  }
  if (trip.status !== "new") {
    res.status(409).json({ error: "Only trips with New status can be edited." });
    return;
  }

  const parsed = await parseAndValidateTripInput(req.body);
  if ("error" in parsed) {
    res.status(parsed.status ?? 400).json({ error: parsed.error });
    return;
  }

  trip.name = parsed.name;
  trip.startAt = parsed.startAt;
  trip.endAt = parsed.endAt;
  trip.startCityId = parsed.startCityId;
  trip.endCityId = parsed.endCityId;
  await trip.save();

  res.status(200).json({ id: trip.id, status: trip.status, totalAmount: trip.totalAmount });
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
// category-detail endpoint already established. Also backs 021's Edit Trip
// pre-fill, which is why each city object carries `id`/`countryId` too, not
// just display strings — a resubmittable value, not only a label.
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
    return {
      id: city?.id ?? cityId,
      countryId: city?.countryId ?? null,
      name: city?.name ?? "",
      countryName: country?.name ?? "",
      countryCode: country?.code ?? "",
    };
  }

  // Flattened across every Claim linked to this trip (draft and submitted
  // alike — see recomputeTripTotalAmount's own doc comment for why), one row
  // per Expense rather than grouped by claim, per this page's own design.
  const claims = await Claim.findAll({ where: { tripId: trip.id } });
  const claimNameById = new Map(claims.map((claim) => [claim.id, claim.name]));
  const expenses = claims.length > 0 ? await Expense.findAll({ where: { claimId: claims.map((claim) => claim.id) }, order: [["expenseDate", "DESC"]] }) : [];
  const categoryIds = Array.from(new Set(expenses.map((expense) => expense.categoryId).filter((id): id is number => id !== null)));
  const categories = categoryIds.length > 0 ? await Category.findAll({ where: { id: categoryIds } }) : [];
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

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
    expenses: expenses.map((expense) => ({
      id: expense.id,
      claimId: expense.claimId,
      claimName: claimNameById.get(expense.claimId) ?? null,
      categoryName: expense.categoryId ? (categoryNameById.get(expense.categoryId) ?? "Uncategorized") : "Uncategorized",
      amount: expense.amount,
      expenseDate: expense.expenseDate,
    })),
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

  // Trip is `paranoid: true` (soft delete, see trip.model.ts) — this only
  // sets deletedAt, so every default Sequelize query excludes it from here
  // on. No child cleanup needed: trips.claims' own FK is ON DELETE SET
  // NULL, not CASCADE, and this branch only ever runs for a "draft" trip,
  // which no code path in this app currently links any claim to anyway.
  await trip.destroy();
  res.status(200).json({ message: "Trip deleted." });
}

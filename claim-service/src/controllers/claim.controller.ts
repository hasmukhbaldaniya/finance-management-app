import type { Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Category, CategoryField, Claim, ClaimInvoiceFile, Expense, Trip, type ClaimType } from "../models";
import { DEFAULT_PAGE_SIZE, MAX_CLAIM_NAME_LENGTH, MAX_EXPENSE_COUNT, MAX_PAGE_SIZE, MIN_CLAIM_NAME_LENGTH, MIN_EXPENSE_COUNT } from "../utils/constants/claim.constant";
import { findDuplicateExpense } from "../utils/duplicate-expense-check";
import { validateExpenseFieldValues } from "../utils/expense-fields";
import { deleteInvoiceFile } from "../utils/invoice-file-storage";
import { recomputeTripFromLinkedClaims } from "../utils/trip-total";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CLAIM_NOT_FOUND_MESSAGE = "Claim not found.";
const ONLY_DRAFT_EDITABLE_MESSAGE = "Only draft claims can be edited.";

type ValidatedClaimInput = { claimType: ClaimType; name: string | null; tripId: number | null };

// Shared between createClaim and updateClaim — 022's Manual Add Claim and
// 023's AI-Powered Step 1 both start from the same Claim Type fork.
async function parseAndValidateClaimInput(body: unknown, employeeId: number, isDraftSave: boolean): Promise<{ error: string } | ValidatedClaimInput> {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const claimType = record.claimType === "trip_linked" ? "trip_linked" : record.claimType === "standalone" ? "standalone" : null;
  if (!claimType) {
    return { error: "Select how this claim is created." };
  }

  if (claimType === "standalone") {
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!isDraftSave && (name.length < MIN_CLAIM_NAME_LENGTH || name.length > MAX_CLAIM_NAME_LENGTH)) {
      return { error: "Claim Name is required." };
    }
    return { claimType, name: name || null, tripId: null };
  }

  const tripId = Number(record.tripId);
  if (!isDraftSave) {
    if (!tripId) return { error: "Select a trip." };
    const trip = await Trip.findOne({ where: { id: tripId, employeeId, status: "new" } });
    if (!trip) return { error: "Select a trip." };
  }
  return { claimType, name: null, tripId: tripId || null };
}

// 022's Create Claim entry point's Manual flow (and 023's AI flow's own
// Step 1) both create the claim shell first, then save its expenses via
// PUT /:id/expenses — see that handler for where status actually flips from
// "draft" to "submitted".
export async function createClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const isDraftSave = req.body?.isDraftSave !== false;
  const parsed = await parseAndValidateClaimInput(req.body, req.userId, isDraftSave);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const claim = await Claim.create({
    organizationId,
    employeeId: req.userId,
    name: parsed.name,
    claimType: parsed.claimType,
    tripId: parsed.tripId,
    creationMethod: req.body?.creationMethod === "ai" ? "ai" : "manual",
    splitFromClaimId: null,
  });

  res.status(201).json({ id: claim.id, status: claim.status });
}

// 021's "edit only while status allows it" precedent, applied here — a
// Draft claim's own shell fields (Claim Type/Name/Trip) can be re-saved;
// anything past Draft is read-only from this endpoint's perspective (022's
// own "only a Draft claim can be edited" rule).
export async function updateClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }
  if (claim.status !== "draft") {
    res.status(409).json({ error: ONLY_DRAFT_EDITABLE_MESSAGE });
    return;
  }

  const isDraftSave = req.body?.isDraftSave !== false;
  const parsed = await parseAndValidateClaimInput(req.body, req.userId, isDraftSave);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  claim.claimType = parsed.claimType;
  claim.name = parsed.name;
  claim.tripId = parsed.tripId;
  await claim.save();

  res.status(200).json({ id: claim.id, status: claim.status });
}

export async function getClaimDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }

  const expenses = await Expense.findAll({ where: { claimId: claim.id }, order: [["position", "ASC"]] });
  const trip = claim.tripId ? await Trip.findByPk(claim.tripId) : null;

  res.status(200).json({
    claim: {
      id: claim.id,
      name: claim.name,
      tripName: trip?.name ?? null,
      claimType: claim.claimType,
      tripId: claim.tripId,
      creationMethod: claim.creationMethod,
      status: claim.status,
      totalAmount: claim.totalAmount,
      splitFromClaimId: claim.splitFromClaimId,
      createdAt: claim.createdAt,
      expenses: expenses.map((expense) => ({
        id: expense.id,
        categoryId: expense.categoryId,
        position: expense.position,
        paidBy: expense.paidBy,
        fieldValues: expense.fieldValues,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        invoiceNumber: expense.invoiceNumber,
        splitFromExpenseId: expense.splitFromExpenseId,
        isRedFlagged: expense.isRedFlagged,
        redFlagReason: expense.redFlagReason,
        sourceInvoiceFileId: expense.sourceInvoiceFileId,
        sourcePageNumber: expense.sourcePageNumber,
        mergedFromExpenseIds: expense.mergedFromExpenseIds,
      })),
    },
  });
}

type IncomingExpense = { id?: number; categoryId: number; paidBy: "company" | "self"; fieldValues: unknown };

function parseIncomingExpenses(raw: unknown): IncomingExpense[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: IncomingExpense[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const record = entry as Record<string, unknown>;
    const categoryId = Number(record.categoryId);
    if (!categoryId) return null;
    const paidBy = record.paidBy === "company" || record.paidBy === "self" ? record.paidBy : null;
    parsed.push({
      id: typeof record.id === "number" ? record.id : undefined,
      categoryId,
      paidBy: paidBy ?? "self",
      fieldValues: record.fieldValues,
    });
  }
  return parsed;
}

// The full-replace endpoint behind both "Save as Draft" and "Save Claim" —
// this is the one place Claim.status actually moves from "draft" to
// "submitted" (022's Overview: this epic never produces anything past that).
// Expenses are replaced by id (not destroy-then-recreate), matching
// CategoryField's own precedent, since Expense.splitFromExpenseId and (023)
// Expense.mergedFromExpenseIds both reference an expense by id.
export async function saveExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }
  if (claim.status !== "draft") {
    res.status(409).json({ error: ONLY_DRAFT_EDITABLE_MESSAGE });
    return;
  }

  const isDraftSave = req.body?.isDraftSave !== false;
  const incoming = parseIncomingExpenses(req.body?.expenses);
  if (!incoming) {
    res.status(400).json({ error: "Invalid expense data." });
    return;
  }
  if (!isDraftSave && (incoming.length < MIN_EXPENSE_COUNT || incoming.length > MAX_EXPENSE_COUNT)) {
    res.status(400).json({ error: `You can have between ${MIN_EXPENSE_COUNT} and ${MAX_EXPENSE_COUNT} expenses.` });
    return;
  }
  if (incoming.length > MAX_EXPENSE_COUNT) {
    res.status(400).json({ error: "You've reached the maximum of 10 expenses." });
    return;
  }

  const existingExpenses = await Expense.findAll({ where: { claimId: claim.id } });
  const existingById = new Map(existingExpenses.map((expense) => [expense.id, expense]));

  const categories = await Category.findAll({ where: { id: incoming.map((expense) => expense.categoryId) } });
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const fieldsByCategoryId = new Map<number, CategoryField[]>();
  await Promise.all(
    Array.from(categoryById.keys()).map(async (categoryId) => {
      fieldsByCategoryId.set(categoryId, await CategoryField.findAll({ where: { categoryId } }));
    })
  );

  type Resolved = IncomingExpense & { amount: string; expenseDate: string | null; invoiceNumber: string | null; normalizedFieldValues: Record<string, unknown> };
  const resolved: Resolved[] = [];

  for (const expense of incoming) {
    const category = categoryById.get(expense.categoryId);
    const existing = expense.id !== undefined ? existingById.get(expense.id) : undefined;
    const isUnchangedCategory = existing !== undefined && existing.categoryId === expense.categoryId;

    if (!category) {
      res.status(400).json({ error: "Category is required." });
      return;
    }
    // A category disabled after an existing expense already used it keeps
    // working for that expense (022's own Edge Cases) — only a brand-new
    // choice of category must currently be active + enabled.
    if (!isUnchangedCategory && (category.status !== "active" || !category.isEnabled)) {
      res.status(400).json({ error: "Category is required." });
      return;
    }
    if (!isDraftSave && !expense.paidBy) {
      res.status(400).json({ error: "Select who paid for this expense." });
      return;
    }

    const fields = fieldsByCategoryId.get(expense.categoryId) ?? [];

    // 023's own Red Flag mechanism: redFlagAction "block" means a triggered
    // flag "block[s] the expense from being saved at all" (its own words),
    // not just highlight it like the default "highlight" action does. Only
    // enforced on the final save — Draft stays lenient, matching every
    // other leniency rule in this codebase (013's own Save-as-Draft
    // posture). isRedFlagged is set once at AI-extraction time and never
    // re-evaluated on edit, so the only way to clear it today is removing
    // and re-extracting the expense — a known limitation, not addressed here.
    if (!isDraftSave && existing?.isRedFlagged && fields.some((field) => field.redFlagAction === "block")) {
      res.status(400).json({ error: "This expense is flagged and can't be submitted until it's resolved." });
      return;
    }
    const validation = await validateExpenseFieldValues(fields, expense.fieldValues, isDraftSave);
    if ("error" in validation) {
      res.status(400).json({ error: validation.error });
      return;
    }

    resolved.push({
      ...expense,
      amount: validation.amount,
      expenseDate: validation.expenseDate,
      invoiceNumber: validation.invoiceNumber,
      normalizedFieldValues: validation.normalizedValues,
    });
  }

  const incomingIds = new Set(resolved.filter((expense) => expense.id !== undefined).map((expense) => expense.id as number));
  const idsToDelete = existingExpenses.filter((expense) => !incomingIds.has(expense.id)).map((expense) => expense.id);
  if (idsToDelete.length > 0) {
    await Expense.destroy({ where: { id: idsToDelete } });
  }

  let position = 0;
  let totalAmount = 0;
  const savedExpenses: Expense[] = [];
  for (const expense of resolved) {
    const payload = {
      categoryId: expense.categoryId,
      organizationId: claim.organizationId,
      position: position++,
      paidBy: expense.paidBy,
      fieldValues: expense.normalizedFieldValues,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      invoiceNumber: expense.invoiceNumber,
    };
    totalAmount += Number(expense.amount);

    const existing = expense.id !== undefined ? existingById.get(expense.id) : undefined;
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      savedExpenses.push(existing);
    } else {
      savedExpenses.push(await Expense.create({ claimId: claim.id, splitFromExpenseId: null, ...payload }));
    }
  }

  claim.totalAmount = totalAmount.toFixed(2);
  claim.status = isDraftSave ? "draft" : "submitted";
  claim.hasBeenSaved = true;
  await claim.save();

  if (claim.tripId) await recomputeTripFromLinkedClaims(claim.tripId);

  // Duplicate check runs at both review (023's own Review step) and here at
  // final save (022's Overview) — highlighted, never blocking.
  const duplicates: { expenseId: number; claimName: string | null; claimantName: string; expenseDate: string | null }[] = [];
  for (const expense of savedExpenses) {
    const duplicate = await findDuplicateExpense({
      organizationId: claim.organizationId,
      invoiceNumber: expense.invoiceNumber,
      expenseDate: expense.expenseDate,
      amount: expense.amount,
      excludeExpenseId: expense.id,
    });
    if (duplicate) duplicates.push({ expenseId: expense.id, ...duplicate });
  }

  res.status(200).json({ message: isDraftSave ? "Claim saved as draft." : "Claim saved.", status: claim.status, totalAmount: claim.totalAmount, duplicates });
}

// 022's Split an Expense — divides one expense's Amount across 2+ new
// Category/Amount portions; the first portion reuses the original row's id
// (informational lineage only, this story has no Unsplit), the rest are new
// rows with splitFromExpenseId pointing back to it.
export async function splitExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }
  if (claim.status !== "draft") {
    res.status(409).json({ error: ONLY_DRAFT_EDITABLE_MESSAGE });
    return;
  }

  const expense = await Expense.findOne({ where: { id: Number(req.params.expenseId), claimId: claim.id } });
  if (!expense) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }

  const portions = Array.isArray(req.body?.portions) ? (req.body.portions as Record<string, unknown>[]) : [];
  if (portions.length < 2) {
    res.status(400).json({ error: "Split amounts must add up to the original expense amount." });
    return;
  }

  const parsedPortions = portions.map((portion) => ({
    categoryId: Number(portion.categoryId),
    amount: Number(portion.amount),
    paidBy: portion.paidBy === "company" || portion.paidBy === "self" ? portion.paidBy : expense.paidBy,
  }));
  if (parsedPortions.some((portion) => !portion.categoryId || !Number.isFinite(portion.amount))) {
    res.status(400).json({ error: "Split amounts must add up to the original expense amount." });
    return;
  }

  const sum = parsedPortions.reduce((total, portion) => total + portion.amount, 0);
  if (Math.abs(sum - Number(expense.amount)) > 0.01) {
    res.status(400).json({ error: "Split amounts must add up to the original expense amount." });
    return;
  }

  const currentExpenseCount = await Expense.count({ where: { claimId: claim.id } });
  if (currentExpenseCount - 1 + parsedPortions.length > MAX_EXPENSE_COUNT) {
    res.status(400).json({ error: "You've reached the maximum of 10 expenses." });
    return;
  }

  const [firstPortion, ...restPortions] = parsedPortions;
  expense.categoryId = firstPortion.categoryId;
  expense.amount = firstPortion.amount.toFixed(2);
  expense.paidBy = firstPortion.paidBy;
  expense.fieldValues = {};
  expense.invoiceNumber = null;
  await expense.save();

  const created = await Promise.all(
    restPortions.map((portion) =>
      Expense.create({
        claimId: claim.id,
        organizationId: claim.organizationId,
        categoryId: portion.categoryId,
        paidBy: portion.paidBy,
        fieldValues: {},
        amount: portion.amount.toFixed(2),
        expenseDate: expense.expenseDate,
        invoiceNumber: null,
        splitFromExpenseId: expense.id,
      })
    )
  );

  res.status(200).json({ expenses: [expense, ...created].map((row) => ({ id: row.id, categoryId: row.categoryId, amount: row.amount, paidBy: row.paidBy })) });
}

// 022's "Move Expenses to a New Claim" (originally called "Split a Claim" —
// renamed in 025 to avoid colliding with that story's own, unrelated "Split
// Claim" feature, cross-employee cost sharing via ExpenseSplitRequest).
// Moves selected expenses onto a brand-new, independent claim the same
// employee still owns; only available while the original is still "draft".
export async function splitClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }
  if (claim.status !== "draft") {
    res.status(409).json({ error: "Only draft claims can be split." });
    return;
  }

  const expenseIds = Array.isArray(req.body?.expenseIds) ? (req.body.expenseIds as unknown[]).map(Number).filter(Number.isFinite) : [];
  if (expenseIds.length === 0) {
    res.status(400).json({ error: "Select at least one expense to move." });
    return;
  }

  const allExpenses = await Expense.findAll({ where: { claimId: claim.id } });
  const toMove = allExpenses.filter((expense) => expenseIds.includes(expense.id));
  if (toMove.length === 0) {
    res.status(400).json({ error: "Select at least one expense to move." });
    return;
  }
  if (toMove.length >= allExpenses.length) {
    res.status(400).json({ error: "At least one expense must remain on this claim." });
    return;
  }

  const isDraftSave = true;
  const newClaimInput = await parseAndValidateClaimInput(req.body?.newClaim, req.userId, isDraftSave);
  if ("error" in newClaimInput) {
    res.status(400).json({ error: newClaimInput.error });
    return;
  }

  const newClaim = await Claim.create({
    organizationId,
    employeeId: req.userId,
    name: newClaimInput.name,
    claimType: newClaimInput.claimType,
    tripId: newClaimInput.tripId,
    creationMethod: claim.creationMethod,
    splitFromClaimId: claim.id,
    // Already assembled from previously-saved expenses — complete from the
    // moment it's created, not an in-progress claim waiting on a first save.
    hasBeenSaved: true,
  });

  await Expense.update({ claimId: newClaim.id }, { where: { id: toMove.map((expense) => expense.id) } });

  const movedTotal = toMove.reduce((total, expense) => total + Number(expense.amount), 0);
  newClaim.totalAmount = movedTotal.toFixed(2);
  await newClaim.save();

  claim.totalAmount = (Number(claim.totalAmount) - movedTotal).toFixed(2);
  await claim.save();

  // The original and the new claim can be linked to different trips (or
  // neither) — each one's own totalAmount just changed, so both need
  // recomputing, not just whichever trip this request happened to mention.
  if (claim.tripId) await recomputeTripFromLinkedClaims(claim.tripId);
  if (newClaim.tripId && newClaim.tripId !== claim.tripId) await recomputeTripFromLinkedClaims(newClaim.tripId);

  res.status(200).json({ originalClaimId: claim.id, newClaimId: newClaim.id, message: "Claim split successfully." });
}

export async function deleteClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claim = await Claim.findOne({ where: { id: Number(req.params.id), employeeId: req.userId } });
  if (!claim) {
    res.status(404).json({ error: CLAIM_NOT_FOUND_MESSAGE });
    return;
  }
  if (claim.status !== "draft") {
    res.status(409).json({ error: "Only draft claims can be deleted." });
    return;
  }

  // Claim is `paranoid: true` (soft delete, see claim.model.ts) — its own
  // `destroy()` below only sets deletedAt, so the DB's own ON DELETE CASCADE
  // from expenses/claim_invoice_files never fires anymore. Expense and
  // ClaimInvoiceFile stay hard-delete models, so their rows (and, for
  // invoice files, the actual file on disk) are removed explicitly here —
  // same real cleanup this claim's data always got, just no longer free
  // from the database's own FK cascade. Deleting these ClaimInvoiceFile rows
  // still cascades to ai_extraction_logs at the DB level, and deleting these
  // Expense rows still cascades to expense_split_requests, exactly as before.
  const invoiceFiles = await ClaimInvoiceFile.findAll({ where: { claimId: claim.id } });
  for (const invoiceFile of invoiceFiles) {
    await deleteInvoiceFile(invoiceFile.storedPath);
  }
  await Expense.destroy({ where: { claimId: claim.id } });
  await ClaimInvoiceFile.destroy({ where: { claimId: claim.id } });

  const tripId = claim.tripId;
  await claim.destroy();
  if (tripId) await recomputeTripFromLinkedClaims(tripId);
  res.status(200).json({ message: "Claim deleted." });
}

// 024's "My Claim" listing — search + Created Date + Status, plus the
// "Split Request" tab as a splitOrigin filter, not a separate endpoint.
export async function listClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));

  // An AI-Powered claim exists in this table from Step 1 onward (needed so
  // uploaded files have somewhere to attach for processing), but shouldn't
  // appear here until the employee actually saves Step 2 — see Claim
  // .hasBeenSaved's own doc comment.
  const conditions: WhereOptions[] = [{ employeeId: req.userId }, { hasBeenSaved: true }];

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search) {
    const numericId = /^#?\d+$/.test(search) ? Number(search.replace("#", "")) : null;
    conditions.push({
      [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, ...(numericId !== null ? [{ id: numericId }] : [])],
    });
  }

  if (typeof req.query.createdDate === "string" && req.query.createdDate) {
    const start = new Date(req.query.createdDate);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      conditions.push({ createdAt: { [Op.gte]: start, [Op.lt]: end } });
    }
  }
  if (typeof req.query.status === "string" && req.query.status) {
    conditions.push({ status: req.query.status });
  }
  if (req.query.splitOrigin === "true") {
    conditions.push({ splitFromClaimId: { [Op.ne]: null } });
  } else if (req.query.splitOrigin === "false") {
    conditions.push({ splitFromClaimId: null });
  }

  const { rows, count } = await Claim.findAndCountAll({
    where: { [Op.and]: conditions },
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  // For a trip-linked claim, the trip's own name stands in for the claim's
  // identity (022's own Open Question, resolved this way) — resolved in one
  // batched query rather than N+1 per row.
  const tripIds = Array.from(new Set(rows.map((claim) => claim.tripId).filter((id): id is number => id !== null)));
  const trips = tripIds.length > 0 ? await Trip.findAll({ where: { id: tripIds } }) : [];
  const tripNameById = new Map(trips.map((trip) => [trip.id, trip.name]));

  res.status(200).json({
    claims: rows.map((claim) => ({
      id: claim.id,
      name: claim.name,
      tripName: claim.tripId ? (tripNameById.get(claim.tripId) ?? null) : null,
      claimType: claim.claimType,
      tripId: claim.tripId,
      status: claim.status,
      totalAmount: claim.totalAmount,
      splitFromClaimId: claim.splitFromClaimId,
      createdAt: claim.createdAt,
    })),
    hasMore: page * pageSize < count,
  });
}

// A narrower sibling of 013's own listing endpoint, not a new resource —
// only active + enabled categories, for the expense form's Category dropdown
// (022's own "not usable" posture for draft/disabled categories).
//
// Includes each category's own CategoryField[] inline, not just id/name/
// description — the dynamic expense form (022's central mechanic) needs the
// full field configuration to render, and `GET /api/categories/:id` (which
// already returns that) sits behind categoryRouter's blanket `requireOwner`
// gate, unreachable by a plain employee. Returning fields here avoids a
// second, still-gated round trip per category selection.
export async function listClaimableCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const categories = await Category.findAll({
    where: { organizationId, status: "active", isEnabled: true },
    order: [["name", "ASC"]],
  });
  const fields = await CategoryField.findAll({ where: { categoryId: categories.map((category) => category.id) }, order: [["position", "ASC"]] });

  res.status(200).json({
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      fields: fields
        .filter((field) => field.categoryId === category.id)
        .map((field) => ({
          id: field.id,
          fieldType: field.fieldType,
          fieldName: field.fieldName,
          tooltip: field.tooltip,
          isRequired: field.isRequired,
          addToPolicyRules: field.addToPolicyRules,
          position: field.position,
          config: field.config,
          conditionalVisibility: field.conditionalVisibility,
          redFlagMode: field.redFlagMode,
          redFlagValue: field.redFlagValue,
          redFlagAction: field.redFlagAction,
        })),
    })),
  });
}

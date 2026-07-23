import type { Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Category, CategoryField, Claim, Employee, Expense, ExpenseSplitRequest, ExpenseSplitRequestMember, Trip } from "../models";
import { getActiveOrganizationId } from "../utils/auth";
import { DEFAULT_PAGE_SIZE, MAX_CLAIM_NAME_LENGTH, MAX_PAGE_SIZE, MIN_CLAIM_NAME_LENGTH } from "../utils/constants/claim.constant";
import { sendSplitRequestEmail } from "../utils/split-request-mailer";
import { env } from "../config/env";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const REQUEST_NOT_FOUND_MESSAGE = "Split request not found.";
const MAX_COLLEAGUES = 9;

// 025's "Split Claim" — sharing one expense's cost across colleagues in the
// same organization. Simplified versus that story doc's own data model: one
// request = one original expense, not a bundle of several (every reference
// screenshot only ever shows one) — this also collapses the doc's separate
// per-expense accept/reject and bulk accept-all/reject-all endpoints into a
// single accept/reject per request, since there's only ever one expense to
// act on.

type IncomingMember = { employeeId: number; percentage?: number; amount?: number };

// 027's redesign of 025's own Request story — the requester's own row is now
// sent explicitly as part of `members` (including their own percentage/
// amount, directly editable in the UI), not implicitly computed as
// "whatever's left over." The whole set (requester + colleagues) must sum to
// exactly 100% / exactly the expense's own amount — not "up to 100%," since
// there's no more "leave an unsplit remainder for yourself" mode.
const SUM_TOLERANCE = 0.01;

export async function createSplitRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const claimId = Number(req.params.id);
  const expenseId = Number(req.params.expenseId);
  const claim = await Claim.findOne({ where: { id: claimId, employeeId: req.userId } });
  if (!claim || claim.status !== "draft") {
    res.status(404).json({ error: "Claim not found." });
    return;
  }
  const expense = await Expense.findOne({ where: { id: expenseId, claimId: claim.id } });
  if (!expense || !expense.categoryId || Number(expense.amount) <= 0) {
    res.status(400).json({ error: "Select a category and enter an amount before splitting this expense." });
    return;
  }

  const splitType = req.body?.splitType === "amount" ? "amount" : "percentage";
  const incomingMembers: IncomingMember[] = Array.isArray(req.body?.members)
    ? req.body.members
        .map((entry: unknown) => {
          const record = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
          return {
            employeeId: Number(record.employeeId),
            percentage: typeof record.percentage === "number" ? record.percentage : undefined,
            amount: typeof record.amount === "number" ? record.amount : undefined,
          };
        })
        .filter((member: IncomingMember) => Boolean(member.employeeId))
    : [];

  const uniqueIds = new Set(incomingMembers.map((member) => member.employeeId));
  if (uniqueIds.size !== incomingMembers.length || !uniqueIds.has(req.userId)) {
    res.status(400).json({ error: "Add at least one colleague to split with." });
    return;
  }

  const colleagueIds = Array.from(uniqueIds).filter((id) => id !== req.userId);
  if (colleagueIds.length === 0 || colleagueIds.length > MAX_COLLEAGUES) {
    res.status(400).json({ error: "Add at least one colleague to split with." });
    return;
  }

  const colleagues = await Employee.findAll({ where: { id: colleagueIds, organizationId } });
  if (colleagues.length !== colleagueIds.length) {
    res.status(400).json({ error: "Select colleagues from your own organization." });
    return;
  }

  const totalAmount = Number(expense.amount);
  let memberAmounts: { employeeId: number; percentage: number; amount: number }[];

  if (splitType === "percentage") {
    const sum = incomingMembers.reduce((total, member) => total + (member.percentage ?? 0), 0);
    if (Math.abs(sum - 100) > SUM_TOLERANCE) {
      res.status(400).json({ error: "Splits must add up to 100%." });
      return;
    }
    memberAmounts = incomingMembers.map((member) => ({
      employeeId: member.employeeId,
      percentage: member.percentage ?? 0,
      amount: Number((((member.percentage ?? 0) / 100) * totalAmount).toFixed(2)),
    }));
  } else {
    const sum = incomingMembers.reduce((total, member) => total + (member.amount ?? 0), 0);
    if (Math.abs(sum - totalAmount) > SUM_TOLERANCE) {
      res.status(400).json({ error: "Splits must add up to the full expense amount." });
      return;
    }
    memberAmounts = incomingMembers.map((member) => ({
      employeeId: member.employeeId,
      percentage: Number((((member.amount ?? 0) / totalAmount) * 100).toFixed(2)),
      amount: member.amount ?? 0,
    }));
  }

  const splitRequest = await ExpenseSplitRequest.create({
    expenseId: expense.id,
    requestedByEmployeeId: req.userId,
    splitType,
  });

  const requesterMember = memberAmounts.find((member) => member.employeeId === req.userId)!;
  await ExpenseSplitRequestMember.create({
    splitRequestId: splitRequest.id,
    employeeId: req.userId,
    percentage: requesterMember.percentage.toFixed(2),
    amount: requesterMember.amount.toFixed(2),
    isRequester: true,
    status: "accepted",
    respondedAt: new Date(),
    resultingExpenseId: null,
  });

  const requester = await Employee.findByPk(req.userId);
  const category = await Category.findByPk(expense.categoryId);
  await Promise.all(
    memberAmounts
      .filter((member) => member.employeeId !== req.userId)
      .map(async (member) => {
        await ExpenseSplitRequestMember.create({
          splitRequestId: splitRequest.id,
          employeeId: member.employeeId,
          percentage: member.percentage.toFixed(2),
          amount: member.amount.toFixed(2),
          isRequester: false,
          status: "pending",
          respondedAt: null,
          resultingExpenseId: null,
        });

        const colleague = colleagues.find((candidate) => candidate.id === member.employeeId);
        if (!colleague) return;
        try {
          await sendSplitRequestEmail({
            email: colleague.email,
            recipientFirstName: colleague.firstName,
            requesterName: requester ? `${requester.firstName} ${requester.lastName}`.trim() : "A colleague",
            categoryName: category?.name ?? "expense",
            amount: member.amount.toFixed(2),
            inboxLink: `${env.corsOrigin}/claims/split-requests`,
          });
        } catch (err) {
          console.error(`Failed to send split request email to employee ${member.employeeId}:`, err);
        }
      })
  );

  res.status(201).json({ id: splitRequest.id });
}

// 025's Split Request Inbox — scope=received (default) is incoming requests
// from colleagues; scope=sent is the requester's own view of what they've
// sent out.
export async function listSplitRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));
  const scope = req.query.scope === "sent" ? "sent" : "received";

  if (scope === "sent") {
    const conditions: WhereOptions[] = [{ requestedByEmployeeId: req.userId }];
    if (typeof req.query.requestedOn === "string" && req.query.requestedOn) {
      const start = new Date(req.query.requestedOn);
      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        conditions.push({ createdAt: { [Op.gte]: start, [Op.lt]: end } });
      }
    }

    const { rows, count } = await ExpenseSplitRequest.findAndCountAll({
      where: { [Op.and]: conditions },
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const members = await ExpenseSplitRequestMember.findAll({ where: { splitRequestId: rows.map((row) => row.id) } });

    res.status(200).json({
      requests: rows.map((row) => {
        const requestMembers = members.filter((member) => member.splitRequestId === row.id && !member.isRequester);
        const totalRequested = requestMembers.reduce((total, member) => total + Number(member.amount), 0);
        return { id: row.id, requestedOn: row.createdAt, requestedAmount: totalRequested.toFixed(2), memberCount: requestMembers.length };
      }),
      hasMore: page * pageSize < count,
    });
    return;
  }

  // 025's own Flow/Open Questions resolve this as "disappears once fully
  // responded" — once the caller has Accepted/Rejected their own row, this
  // request drops off their inbox rather than lingering with just a
  // changed badge.
  const memberConditions: WhereOptions[] = [{ employeeId: req.userId }, { isRequester: false }, { status: "pending" }];
  const myMembers = await ExpenseSplitRequestMember.findAll({ where: { [Op.and]: memberConditions } });
  const requestIds = myMembers.map((member) => member.splitRequestId);
  if (requestIds.length === 0) {
    res.status(200).json({ requests: [], hasMore: false });
    return;
  }

  const requestConditions: WhereOptions[] = [{ id: requestIds }];
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (typeof req.query.requestedOn === "string" && req.query.requestedOn) {
    const start = new Date(req.query.requestedOn);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      requestConditions.push({ createdAt: { [Op.gte]: start, [Op.lt]: end } });
    }
  }

  const allMatching = await ExpenseSplitRequest.findAll({ where: { [Op.and]: requestConditions }, order: [["createdAt", "DESC"]] });
  const requesterIds = Array.from(new Set(allMatching.map((row) => row.requestedByEmployeeId)));
  const requesters = await Employee.findAll({ where: { id: requesterIds } });
  const requesterById = new Map(requesters.map((employee) => [employee.id, employee]));

  const filtered = search
    ? allMatching.filter((row) => {
        const requester = requesterById.get(row.requestedByEmployeeId);
        const name = requester ? `${requester.firstName} ${requester.lastName}`.trim().toLowerCase() : "";
        return name.includes(search.toLowerCase());
      })
    : allMatching;

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const myMemberByRequestId = new Map(myMembers.map((member) => [member.splitRequestId, member]));

  res.status(200).json({
    requests: paged.map((row) => {
      const requester = requesterById.get(row.requestedByEmployeeId);
      const myMember = myMemberByRequestId.get(row.id);
      return {
        id: row.id,
        requestedByName: requester ? `${requester.firstName} ${requester.lastName}`.trim() : "Unknown",
        requestedOn: row.createdAt,
        requestedAmount: myMember?.amount ?? "0.00",
        status: myMember?.status ?? "pending",
      };
    }),
    hasMore: page * pageSize < filtered.length,
  });
}

async function buildSplitRequestDetail(splitRequest: ExpenseSplitRequest, viewerId: number) {
  const [expense, members] = await Promise.all([
    Expense.findByPk(splitRequest.expenseId),
    ExpenseSplitRequestMember.findAll({ where: { splitRequestId: splitRequest.id } }),
  ]);
  if (!expense) return null;

  const [category, claim, requester, employees] = await Promise.all([
    expense.categoryId ? Category.findByPk(expense.categoryId) : null,
    Claim.findByPk(expense.claimId),
    Employee.findByPk(splitRequest.requestedByEmployeeId),
    Employee.findAll({ where: { id: members.map((member) => member.employeeId) } }),
  ]);
  const fields = expense.categoryId ? await CategoryField.findAll({ where: { categoryId: expense.categoryId }, order: [["position", "ASC"]] }) : [];
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const myMember = members.find((member) => member.employeeId === viewerId);

  return {
    id: splitRequest.id,
    requestedBy: requester ? `${requester.firstName} ${requester.lastName}`.trim() : "Unknown",
    requestedOn: splitRequest.createdAt,
    splitType: splitRequest.splitType,
    expense: {
      id: expense.id,
      categoryId: expense.categoryId,
      categoryName: category?.name ?? "Uncategorized",
      claimName: claim?.name ?? null,
      isTripLinked: claim?.claimType === "trip_linked",
      amount: expense.amount,
      fieldValues: expense.fieldValues,
      fields: fields.map((field) => ({
        id: field.id,
        fieldType: field.fieldType,
        fieldName: field.fieldName,
        config: field.config,
      })),
    },
    members: members.map((member) => ({
      employeeId: member.employeeId,
      name: employeeById.get(member.employeeId) ? `${employeeById.get(member.employeeId)!.firstName} ${employeeById.get(member.employeeId)!.lastName}`.trim() : "Unknown",
      percentage: member.percentage,
      amount: member.amount,
      isRequester: member.isRequester,
      status: member.status,
    })),
    myStatus: myMember?.status ?? null,
    isRequester: myMember?.isRequester ?? false,
  };
}

export async function getSplitRequestDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const splitRequest = await ExpenseSplitRequest.findByPk(Number(req.params.id));
  if (!splitRequest) {
    res.status(404).json({ error: REQUEST_NOT_FOUND_MESSAGE });
    return;
  }
  const membership = await ExpenseSplitRequestMember.findOne({ where: { splitRequestId: splitRequest.id, employeeId: req.userId } });
  if (!membership) {
    res.status(404).json({ error: REQUEST_NOT_FOUND_MESSAGE });
    return;
  }

  const detail = await buildSplitRequestDetail(splitRequest, req.userId);
  if (!detail) {
    res.status(404).json({ error: REQUEST_NOT_FOUND_MESSAGE });
    return;
  }
  res.status(200).json({ request: detail });
}

async function loadRespondableMembership(splitRequestId: number, employeeId: number): Promise<ExpenseSplitRequestMember | null> {
  const member = await ExpenseSplitRequestMember.findOne({
    where: { splitRequestId, employeeId, isRequester: false },
  });
  return member;
}

// Accepting is what actually turns a colleague's own share into a real
// claim — same Claim Type fork (standalone vs. trip-linked) 022's own claim
// creation already uses.
export async function acceptSplitRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const splitRequestId = Number(req.params.id);
  const member = await loadRespondableMembership(splitRequestId, req.userId);
  if (!member) {
    res.status(404).json({ error: REQUEST_NOT_FOUND_MESSAGE });
    return;
  }
  if (member.status !== "pending") {
    res.status(409).json({ error: "You've already responded to this split." });
    return;
  }

  const splitRequest = await ExpenseSplitRequest.findByPk(splitRequestId);
  const originalExpense = splitRequest ? await Expense.findByPk(splitRequest.expenseId) : null;
  if (!splitRequest || !originalExpense) {
    res.status(404).json({ error: REQUEST_NOT_FOUND_MESSAGE });
    return;
  }

  const claimType = req.body?.claimType === "trip_linked" ? "trip_linked" : req.body?.claimType === "standalone" ? "standalone" : null;
  if (!claimType) {
    res.status(400).json({ error: "Select how you'd like to raise this claim." });
    return;
  }

  let name: string | null = null;
  let tripId: number | null = null;
  if (claimType === "standalone") {
    const trimmedName: string = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (trimmedName.length < MIN_CLAIM_NAME_LENGTH || trimmedName.length > MAX_CLAIM_NAME_LENGTH) {
      res.status(400).json({ error: "Claim Name is required." });
      return;
    }
    name = trimmedName;
  } else {
    tripId = Number(req.body?.tripId) || null;
    if (!tripId) {
      res.status(400).json({ error: "Select a trip." });
      return;
    }
    const trip = await Trip.findOne({ where: { id: tripId, employeeId: req.userId, status: "new" } });
    if (!trip) {
      res.status(400).json({ error: "Select a trip." });
      return;
    }
  }

  const fields = originalExpense.categoryId ? await CategoryField.findAll({ where: { categoryId: originalExpense.categoryId } }) : [];
  const amountField = fields.find((field) => field.fieldType === "amount" && field.config.useAsClaimAmount === true);
  const fieldValues = { ...originalExpense.fieldValues };
  if (amountField) fieldValues[String(amountField.id)] = Number(member.amount);

  const newClaim = await Claim.create({
    organizationId,
    employeeId: req.userId,
    name,
    claimType,
    tripId,
    creationMethod: "split",
    status: "draft",
    hasBeenSaved: true,
    splitFromClaimId: null,
    totalAmount: member.amount,
  });

  const newExpense = await Expense.create({
    claimId: newClaim.id,
    organizationId,
    categoryId: originalExpense.categoryId,
    position: 0,
    paidBy: "self",
    fieldValues,
    amount: member.amount,
    expenseDate: originalExpense.expenseDate,
    invoiceNumber: originalExpense.invoiceNumber,
    splitFromExpenseId: null,
  });

  member.status = "accepted";
  member.respondedAt = new Date();
  member.resultingExpenseId = newExpense.id;
  await member.save();

  res.status(200).json({ newClaimId: newClaim.id, message: "Split accepted — claim created." });
}

export async function rejectSplitRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const member = await loadRespondableMembership(Number(req.params.id), req.userId);
  if (!member) {
    res.status(404).json({ error: REQUEST_NOT_FOUND_MESSAGE });
    return;
  }
  if (member.status !== "pending") {
    res.status(409).json({ error: "You've already responded to this split." });
    return;
  }

  member.status = "rejected";
  member.respondedAt = new Date();
  await member.save();

  res.status(200).json({ message: "Split rejected." });
}

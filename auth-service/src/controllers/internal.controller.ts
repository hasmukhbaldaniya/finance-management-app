import type { Request, Response } from "express";
import { Airline, Employee } from "../models";

// The one cross-service read claim-service (and today's still-monolithic
// backend) genuinely needs: real employee names/emails for display —
// Category "created by", split-request colleague validation/names,
// duplicate-bill-detection's claimant name (see
// docs/PLANS/microservices-plan.md's Phase 3 for the full audit of these
// three call sites). Everything else those call sites used to read
// (organizationId, for scoping) now comes from the caller's own JWT claim
// instead of a DB/HTTP round trip — see requireAuth's organizationId claim.
export async function lookupEmployees(req: Request, res: Response): Promise<void> {
  const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const ids = rawIds.filter((id: unknown): id is number => typeof id === "number" && Number.isInteger(id));

  if (ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array of employee ids." });
    return;
  }

  const employees = await Employee.findAll({ where: { id: ids } });
  res.status(200).json({
    employees: employees.map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      organizationId: employee.organizationId,
    })),
  });
}

// A second, unrelated cross-service read: expense-fields.ts (claim-service)
// validates a submitted "airline" picker field against real Airline ids.
// Airline is fixed, seeded, global, non-org-scoped catalog data with no
// management UI (see backend/CLAUDE.md's Employee Invitation section) — safe
// for the caller to cache indefinitely per-process, since nothing can ever
// change it at runtime.
export async function listAirlines(_req: Request, res: Response): Promise<void> {
  const airlines = await Airline.findAll();
  res.status(200).json({ airlines: airlines.map((airline) => ({ id: airline.id, name: airline.name })) });
}

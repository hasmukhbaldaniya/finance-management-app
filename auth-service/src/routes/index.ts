import { Router } from "express";
import { airlineRouter } from "./airline.routes";
import { associatedOrganizationRouter } from "./associated-organization.routes";
import { authRouter } from "./auth.routes";
import { departmentRouter } from "./department.routes";
import { employeeBulkInviteRouter } from "./employee-bulk-invite.routes";
import { employeeOnboardingRouter } from "./employee-onboarding.routes";
import { employeeRouter } from "./employee.routes";
import { gradeRouter } from "./grade.routes";
import { healthRouter } from "./health.routes";
import { internalRouter } from "./internal.routes";
import { organizationRouter } from "./organization.routes";
import { projectRouter } from "./project.routes";
import { roleRouter } from "./role.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/organizations", organizationRouter);
apiRouter.use("/grades", gradeRouter);
apiRouter.use("/departments", departmentRouter);
apiRouter.use("/roles", roleRouter);
apiRouter.use("/associated-organizations", associatedOrganizationRouter);
apiRouter.use("/employee-onboarding", employeeOnboardingRouter);
apiRouter.use("/employees/bulk", employeeBulkInviteRouter);
apiRouter.use("/employees", employeeRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/airlines", airlineRouter);
// Internal-only — never reached by the browser, never routed through the
// (future) gateway. claim-service (and today's still-monolithic backend)
// call this for employee name/email lookups it needs but no longer has
// local DB access to (category "created by", split-request colleagues,
// duplicate-bill-detection's claimant name) — see internal.routes.ts.
apiRouter.use("/internal", internalRouter);

import { Router } from "express";
import { airlineRouter } from "./airline.routes";
import { associatedOrganizationRouter } from "./associated-organization.routes";
import { authRouter } from "./auth.routes";
import { departmentRouter } from "./department.routes";
import { employeeRouter } from "./employee.routes";
import { gradeRouter } from "./grade.routes";
import { healthRouter } from "./health.routes";
import { organizationRouter } from "./organization.routes";
import { projectRouter } from "./project.routes";
import { roleRouter } from "./role.routes";
import { userRouter } from "./user.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/organizations", organizationRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/grades", gradeRouter);
apiRouter.use("/departments", departmentRouter);
apiRouter.use("/roles", roleRouter);
apiRouter.use("/associated-organizations", associatedOrganizationRouter);
apiRouter.use("/employees", employeeRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/airlines", airlineRouter);

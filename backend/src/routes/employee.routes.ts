import { Router } from "express";
import {
  addEmployeeFfNumbers,
  createEmployee,
  listEmployeesForPicker,
  saveEmployeeApprovals,
  sendEmployeeInvite,
  updateEmployeeCompanyAccess,
} from "../controllers/employee.controller";
import { requireAuth } from "../middleware/require-auth";

export const employeeRouter = Router();

employeeRouter.use(requireAuth);

employeeRouter.get("/", listEmployeesForPicker);
employeeRouter.post("/", createEmployee);
employeeRouter.put("/:id/company-access", updateEmployeeCompanyAccess);
employeeRouter.post("/:id/ff-numbers", addEmployeeFfNumbers);
employeeRouter.post("/:id/approvals", saveEmployeeApprovals);
employeeRouter.post("/:id/send-invite", sendEmployeeInvite);

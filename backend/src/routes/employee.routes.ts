import { Router } from "express";
import {
  addEmployeeFfNumbers,
  createEmployee,
  getEmployeeDetail,
  listEmployees,
  listEmployeesForPicker,
  saveEmployeeApprovals,
  sendEmployeeInvite,
  updateEmployeeBasicInfo,
  updateEmployeeCompanyAccess,
  updateEmployeeStatus,
} from "../controllers/employee.controller";
import { requireAuth } from "../middleware/require-auth";

export const employeeRouter = Router();

employeeRouter.use(requireAuth);

// Distinct from GET "/" (009's full listing) — this is 008's minimal,
// unpaginated approver picker, moved to its own path once 009 needed the
// main path for something with a materially different shape. Registered
// before GET "/:id" so a request to "/approvers" matches this exact route,
// not the "/:id" pattern with id="approvers".
employeeRouter.get("/approvers", listEmployeesForPicker);
employeeRouter.get("/", listEmployees);
employeeRouter.post("/", createEmployee);
employeeRouter.get("/:id", getEmployeeDetail);
employeeRouter.patch("/:id", updateEmployeeBasicInfo);
employeeRouter.patch("/:id/status", updateEmployeeStatus);
employeeRouter.put("/:id/company-access", updateEmployeeCompanyAccess);
employeeRouter.post("/:id/ff-numbers", addEmployeeFfNumbers);
employeeRouter.post("/:id/approvals", saveEmployeeApprovals);
employeeRouter.post("/:id/send-invite", sendEmployeeInvite);
employeeRouter.post("/:id/resend", sendEmployeeInvite);

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
import {
  getMyProfile,
  resendMyMobileOtp,
  setMyMobile,
  updateMyProfile,
  verifyMyMobileOtp,
} from "../controllers/employee-profile.controller";
import { requireAuth } from "../middleware/require-auth";

export const employeeRouter = Router();

employeeRouter.use(requireAuth);

// Distinct from GET "/" (009's full listing) — this is 008's minimal,
// unpaginated approver picker, moved to its own path once 009 needed the
// main path for something with a materially different shape. Registered
// before GET "/:id" so a request to "/approvers" matches this exact route,
// not the "/:id" pattern with id="approvers".
employeeRouter.get("/approvers", listEmployeesForPicker);
// 012's self-service profile — every handler here acts on req.userId only,
// never an :id param, so it must be registered before GET/PATCH "/:id"
// below (otherwise "/me" would match "/:id" with id="me" first).
employeeRouter.get("/me", getMyProfile);
employeeRouter.patch("/me", updateMyProfile);
employeeRouter.put("/me/mobile", setMyMobile);
employeeRouter.post("/me/mobile-otp", resendMyMobileOtp);
employeeRouter.post("/me/mobile-otp/verify", verifyMyMobileOtp);
employeeRouter.get("/", listEmployees);
employeeRouter.post("/", createEmployee);
employeeRouter.get("/:id", getEmployeeDetail);
employeeRouter.patch("/:id", updateEmployeeBasicInfo);
employeeRouter.patch("/:id/status", updateEmployeeStatus);
employeeRouter.put("/:id/company-access", updateEmployeeCompanyAccess);
employeeRouter.post("/:id/ff-numbers", addEmployeeFfNumbers);
employeeRouter.post("/:id/approvals", saveEmployeeApprovals);
// One resource-oriented route for both the initial invite and a later
// resend — sending an invitation is idempotent from the caller's
// perspective (it (re-)creates the same side effect), so there's no need
// for two URLs mapped to the identical handler. The frontend still exposes
// two distinctly-named functions (sendEmployeeInvite/resendEmployeeInvite)
// for readability at their two different call sites.
employeeRouter.post("/:id/invitations", sendEmployeeInvite);

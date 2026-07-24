import { Router } from "express";
import {
  createDepartment,
  deleteDepartment,
  listDepartmentMembers,
  listDepartments,
  updateDepartment,
  updateDepartmentStatus,
} from "../controllers/department.controller";
import { requireAuth } from "../middleware/require-auth";

export const departmentRouter = Router();

departmentRouter.use(requireAuth);

departmentRouter.get("/", listDepartments);
departmentRouter.post("/", createDepartment);
departmentRouter.put("/:id", updateDepartment);
departmentRouter.patch("/:id/status", updateDepartmentStatus);
departmentRouter.delete("/:id", deleteDepartment);
departmentRouter.get("/:id/members", listDepartmentMembers);

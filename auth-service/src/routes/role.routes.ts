import { Router } from "express";
import {
  createRole,
  deleteRole,
  listRoleMembers,
  listRoles,
  updateRole,
  updateRoleStatus,
} from "../controllers/role.controller";
import { requireAuth } from "../middleware/require-auth";

export const roleRouter = Router();

roleRouter.use(requireAuth);

roleRouter.get("/", listRoles);
roleRouter.post("/", createRole);
roleRouter.put("/:id", updateRole);
roleRouter.patch("/:id/status", updateRoleStatus);
roleRouter.delete("/:id", deleteRole);
roleRouter.get("/:id/members", listRoleMembers);

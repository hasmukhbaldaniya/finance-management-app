import { Router } from "express";
import {
  createGrade,
  deleteGrade,
  listGradeMembers,
  listGrades,
  updateGrade,
  updateGradeStatus,
} from "../controllers/grade.controller";
import { requireAuth } from "../middleware/require-auth";

export const gradeRouter = Router();

gradeRouter.use(requireAuth);

gradeRouter.get("/", listGrades);
gradeRouter.post("/", createGrade);
gradeRouter.put("/:id", updateGrade);
gradeRouter.patch("/:id/status", updateGradeStatus);
gradeRouter.delete("/:id", deleteGrade);
gradeRouter.get("/:id/members", listGradeMembers);

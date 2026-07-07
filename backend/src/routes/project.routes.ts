import { Router } from "express";
import { createProject, listProjects } from "../controllers/project.controller";
import { requireAuth } from "../middleware/require-auth";

export const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.get("/", listProjects);
projectRouter.post("/", createProject);

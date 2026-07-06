import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Department, Project } from "../models";
import { getActiveOrganizationId } from "../utils/auth";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const departmentId = Number(req.body?.departmentId);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (name.length < 2 || name.length > 100) {
    res.status(400).json({ error: "Enter a project name between 2 and 100 characters." });
    return;
  }

  const department = await Department.findOne({ where: { id: departmentId, organizationId, isActive: true } });
  if (!department) {
    res.status(404).json({ error: "This Department is no longer available. Please choose another." });
    return;
  }

  const existing = await Project.findOne({ where: { departmentId, name: { [Op.iLike]: name } } });
  if (existing) {
    res.status(409).json({ error: "A project with this name already exists in this department." });
    return;
  }

  const project = await Project.create({ organizationId, departmentId, name });
  res.status(201).json({
    project: { id: project.id, name: project.name, departmentId: project.departmentId, isActive: project.isActive },
  });
}

export async function listProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const departmentId = Number(req.query.departmentId);
  const where: Record<string, unknown> = { organizationId, isActive: true };
  if (departmentId) where.departmentId = departmentId;

  const projects = await Project.findAll({ where, order: [["name", "ASC"]] });
  res.status(200).json({
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      departmentId: project.departmentId,
      isActive: project.isActive,
    })),
  });
}

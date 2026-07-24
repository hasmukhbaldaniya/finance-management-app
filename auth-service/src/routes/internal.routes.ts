import { Router } from "express";
import { listAirlines, lookupEmployees } from "../controllers/internal.controller";
import { requireInternalAuth } from "../middleware/require-internal-auth";

export const internalRouter = Router();

internalRouter.use(requireInternalAuth);
internalRouter.post("/employees/lookup", lookupEmployees);
internalRouter.get("/airlines", listAirlines);

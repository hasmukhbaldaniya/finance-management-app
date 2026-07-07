import { Router } from "express";
import { listAirlines } from "../controllers/airline.controller";
import { requireAuth } from "../middleware/require-auth";

export const airlineRouter = Router();

airlineRouter.use(requireAuth);

airlineRouter.get("/", listAirlines);

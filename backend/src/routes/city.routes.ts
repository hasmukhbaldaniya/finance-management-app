import { Router } from "express";
import { listCities } from "../controllers/city.controller";
import { requireAuth } from "../middleware/require-auth";

export const cityRouter = Router();

cityRouter.use(requireAuth);

cityRouter.get("/", listCities);

import { Router } from "express";
import { listCountries } from "../controllers/country.controller";
import { requireAuth } from "../middleware/require-auth";

export const countryRouter = Router();

countryRouter.use(requireAuth);

countryRouter.get("/", listCountries);

import { Router } from "express";
import { createTrip, deleteTrip, getTripDetail, listTrips } from "../controllers/trip.controller";
import { requireAuth } from "../middleware/require-auth";

export const tripRouter = Router();

// No requireOwner gate — any authenticated employee creates/sees their own
// trips (018's own posture, not a Company-Administrator screen).
tripRouter.use(requireAuth);

tripRouter.get("/", listTrips);
tripRouter.post("/", createTrip);
tripRouter.get("/:id", getTripDetail);
tripRouter.delete("/:id", deleteTrip);

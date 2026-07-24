import { Router } from "express";
import { createTrip, deleteTrip, getTripDetail, listTrips, updateTrip } from "../controllers/trip.controller";
import { listTripsForOrg } from "../controllers/org-reports.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireOwner } from "../middleware/require-owner";

export const tripRouter = Router();

// No requireOwner gate — any authenticated employee creates/sees their own
// trips (018's own posture, not a Company-Administrator screen).
tripRouter.use(requireAuth);

// 028-reports.md's org-wide read endpoint — requireOwner-gated, registered
// before GET "/:id" for the same reason claim.routes.ts's "/org" is.
tripRouter.get("/org", requireOwner, listTripsForOrg);

tripRouter.get("/", listTrips);
tripRouter.post("/", createTrip);
tripRouter.get("/:id", getTripDetail);
tripRouter.patch("/:id", updateTrip);
tripRouter.delete("/:id", deleteTrip);

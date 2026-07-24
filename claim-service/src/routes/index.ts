import { Router } from "express";
import { categoryClaimableRouter } from "./category-claimable.routes";
import { categoryRouter } from "./category.routes";
import { claimRouter } from "./claim.routes";
import { cityRouter } from "./city.routes";
import { countryRouter } from "./country.routes";
import { healthRouter } from "./health.routes";
import { splitRequestRouter } from "./split-request.routes";
import { tripRouter } from "./trip.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/categories", categoryClaimableRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/countries", countryRouter);
apiRouter.use("/cities", cityRouter);
apiRouter.use("/trips", tripRouter);
apiRouter.use("/claims", claimRouter);
apiRouter.use("/split-requests", splitRequestRouter);

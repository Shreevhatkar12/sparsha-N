import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth as authenticate } from "../lib/auth.ts";
import type { JwtPayload } from "../lib/auth.ts";
import { getDashboardPendingCounts } from "../services/reportService.ts";

const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);

dashboardRoutes.get("/pending", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as Request & { user?: JwtPayload }).user!;
    const data = await getDashboardPendingCounts(user);
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
});

export default dashboardRoutes;

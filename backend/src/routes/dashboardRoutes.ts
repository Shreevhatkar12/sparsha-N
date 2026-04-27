// backend/src/routes/dashboard.routes.ts

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
// Import your authorize/requireRole middleware
import { requireAuth as authenticate, authorize } from '../lib/auth.js'; 
import type { JwtPayload } from '../lib/auth.js';
import { getDashboardPendingCounts } from '../services/reportService.js';

const dashboardRoutes = Router();

// 1. Authenticate everyone first
dashboardRoutes.use(authenticate);

// 2. RESTRICT: Only allow these roles to access ANY dashboard route
dashboardRoutes.use(authorize('super_admin', 'center_admin'));

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
import { Router } from "express";
import { requireAuth as authenticate, requireRole } from "../lib/auth.js";
import {
  dashboardController,
  attendanceController,
  examsController,
  studentsFilterController,
  pendingItemsController,
  exportCsvController
} from "../controllers/reportController.js";

const reportRoutes = Router();

reportRoutes.use(authenticate);

reportRoutes.get("/dashboard", dashboardController);
reportRoutes.get("/attendance", attendanceController);
reportRoutes.get("/exams", examsController);
reportRoutes.get("/students", studentsFilterController);
reportRoutes.get("/pending", pendingItemsController);
reportRoutes.get("/export", requireRole("admin", "staff"), exportCsvController);

export default reportRoutes;

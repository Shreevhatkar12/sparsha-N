import { Router } from "express";
import { requireAuth as authenticate, requireRole } from "../lib/auth.js";
import {
  createExamController,
  getExamByIdController,
  getExamComparisonController,
  getPendingExamScoresController,
  getStudentExamScoresController,
  listExamsController,
  upsertExamScoresController,
} from "../controllers/examController.js";

const examRoutes = Router();

examRoutes.use(authenticate);

examRoutes.post("/", requireRole("admin", "teacher", "staff"), createExamController);
examRoutes.get("/", listExamsController);
examRoutes.get("/comparison", getExamComparisonController);
examRoutes.get("/students/:studentId", getStudentExamScoresController);
examRoutes.get("/:examId", getExamByIdController);
examRoutes.post(
  "/:examId/scores",
  requireRole("admin", "teacher", "staff"),
  upsertExamScoresController,
);
examRoutes.get("/:examId/pending", getPendingExamScoresController);

export default examRoutes;

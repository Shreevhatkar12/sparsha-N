import { Router } from "express";
import { requireAuth as authenticate, requireRole } from "../lib/auth.ts";
import {
  createExamController,
  getExamByIdController,
  getExamComparisonController,
  getPendingExamScoresController,
  getStudentExamScoresController,
  listExamsController,
  upsertExamScoresController,
} from "../controllers/examController.ts";
import { validate } from "../middleware/validate.ts";
import { createExamSchema, upsertExamScoresSchema } from "../validation/schemas.ts";

const examRoutes = Router();

examRoutes.use(authenticate);

examRoutes.post("/", requireRole("admin", "teacher", "staff"), validate(createExamSchema), createExamController);
examRoutes.get("/", listExamsController);
examRoutes.get("/comparison", getExamComparisonController);
examRoutes.get("/students/:studentId", getStudentExamScoresController);
examRoutes.get("/:examId", getExamByIdController);
examRoutes.post(
  "/:examId/scores",
  requireRole("admin", "teacher", "staff"),
  validate(upsertExamScoresSchema),
  upsertExamScoresController,
);
examRoutes.get("/:examId/pending", getPendingExamScoresController);

export default examRoutes;

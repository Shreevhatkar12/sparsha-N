import { Router } from "express";
import { requireAuth as authenticate, requireRole } from '../lib/auth.js';
import {
  createExamController,
  getExamByIdController,
  getExamComparisonController,
  getPendingExamScoresController,
  getStudentExamScoresController,
  listExamsController,
  upsertExamScoresController,
} from '../controllers/examController.js';
import { validate } from '../middleware/validate.js';
import { createExamSchema, upsertExamScoresSchema } from '../validators/schemas.js';

const examRoutes = Router();

examRoutes.use(authenticate);

examRoutes.post("/", requireRole("super_admin", "teacher", "staff"), validate(createExamSchema), createExamController);
examRoutes.get("/", listExamsController);
examRoutes.get("/comparison", getExamComparisonController);
examRoutes.get("/students/:studentId", getStudentExamScoresController);
examRoutes.get("/:examId", getExamByIdController);
examRoutes.post(
  "/:examId/scores",
  requireRole("super_admin", "teacher", "staff"),
  validate(upsertExamScoresSchema),
  upsertExamScoresController,
);
examRoutes.get("/:examId/pending", getPendingExamScoresController);

export default examRoutes;

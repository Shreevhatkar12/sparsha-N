import { Router } from "express";
import { requireAuth as authenticate } from '../lib/auth.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { requireCenterAccess } from '../middleware/center.middleware.js';
import { PERMISSIONS } from '../config/rbac.js';
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
examRoutes.use(requireCenterAccess());

examRoutes.post("/", requirePermission(PERMISSIONS.MANAGE_EXAMS), validate(createExamSchema), createExamController);
examRoutes.get("/", listExamsController);
examRoutes.get("/comparison", getExamComparisonController);
examRoutes.get("/students/:studentId", getStudentExamScoresController);
examRoutes.get("/:examId", getExamByIdController);
examRoutes.post(
  "/:examId/scores",
  requirePermission(PERMISSIONS.MANAGE_EXAMS),
  validate(upsertExamScoresSchema),
  upsertExamScoresController,
);
examRoutes.get("/:examId/pending", getPendingExamScoresController);

export default examRoutes;

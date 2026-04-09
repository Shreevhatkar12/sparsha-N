import { Router } from "express";
import { requireAuth as authenticate, requireRole } from "../lib/auth.js";
import {
  createTemplateController,
  deleteSubmissionController,
  deleteTemplateController,
  getPendingFormsController,
  getStudentSubmissionsController,
  getSubmissionController,
  getTemplateController,
  listSubmissionsController,
  listTemplatesController,
  submitFormController,
  updateTemplateController,
} from "../controllers/formController.js";

const formRoutes = Router();

formRoutes.use(authenticate);

formRoutes.post("/templates", requireRole("admin"), createTemplateController);
formRoutes.get("/templates", listTemplatesController);
formRoutes.get("/templates/:templateId", getTemplateController);
formRoutes.put("/templates/:templateId", requireRole("admin"), updateTemplateController);
formRoutes.delete("/templates/:templateId", requireRole("admin"), deleteTemplateController);

formRoutes.post("/submissions", submitFormController);
formRoutes.get("/submissions", listSubmissionsController);
formRoutes.get("/submissions/:submissionId", getSubmissionController);
formRoutes.delete("/submissions/:submissionId", requireRole("admin"), deleteSubmissionController);
formRoutes.get("/submissions/student/:studentId", getStudentSubmissionsController);

formRoutes.get("/pending", getPendingFormsController);

export default formRoutes;

import { Router } from "express";
import { requireAuth as authenticate, requireRole } from '../lib/auth.js';
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
} from '../controllers/formController.js';
import { validate } from '../middleware/validate.js';
import {
  createFormTemplateSchema,
  submitFormSchema,
  updateFormTemplateSchema,
} from '../validators/schemas.js';

const formRoutes = Router();

formRoutes.use(authenticate);

formRoutes.post("/templates", requireRole("super_admin"), validate(createFormTemplateSchema), createTemplateController);


formRoutes.get("/templates", listTemplatesController);
formRoutes.get("/templates/:templateId", getTemplateController);
formRoutes.put(
  "/templates/:templateId",
  requireRole("super_admin"),
  validate(updateFormTemplateSchema),
  updateTemplateController,
);
formRoutes.delete("/templates/:templateId", requireRole("super_admin"), deleteTemplateController);

formRoutes.post("/submissions", validate(submitFormSchema), submitFormController);
formRoutes.get("/submissions", listSubmissionsController);
formRoutes.get("/submissions/:submissionId", getSubmissionController);
formRoutes.delete("/submissions/:submissionId", requireRole("super_admin"), deleteSubmissionController);
formRoutes.get("/submissions/student/:studentId", getStudentSubmissionsController);

formRoutes.get("/pending", getPendingFormsController);

export default formRoutes;

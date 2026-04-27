import { Router } from "express";
import { requireAuth as authenticate, requireRole } from '../lib/auth.js';
import { validate } from '../middleware/validate.js';
import { createCenterSchema, createProgramSchema } from '../validators/schemas.js';
import {
  assignProgramController,
  assignUserController,
  createCenterController,
  deleteCenterController,
  createProgramController,
  getCenterController,
  getProgramDetailsController,
  listCentersController,
  listProgramsController,
  programCentersController,
  removeProgramController,
  removeUserController,
  updateCenterController,
  updateProgramController,
} from '../controllers/centerController.js';

const centerRoutes = Router();
const programRoutes = Router();

centerRoutes.use(authenticate);
programRoutes.use(authenticate);

centerRoutes.get("/", listCentersController);
centerRoutes.get("/:centerId", getCenterController);

centerRoutes.post("/", requireRole("super_admin","center_admin"), validate(createCenterSchema), createCenterController);
centerRoutes.delete("/:centerId", requireRole("super_admin","center_admin"), deleteCenterController);
centerRoutes.put("/:centerId", requireRole("super_admin","center_admin"), updateCenterController);

centerRoutes.post("/:centerId/programs", requireRole("super_admin","center_admin","teacher"), assignProgramController);
centerRoutes.delete(
  "/:centerId/programs/:programId",
  requireRole("super_admin","center_admin"),
  removeProgramController,
);
centerRoutes.post("/:centerId/users", requireRole("super_admin","center_admin"), assignUserController);
centerRoutes.delete("/:centerId/users/:userId", requireRole("super_admin","center_admin"), removeUserController);

programRoutes.get("/", listProgramsController);
programRoutes.get("/:programId", getProgramDetailsController);
programRoutes.post("/", requireRole("super_admin","center_admin"), validate(createProgramSchema), createProgramController);
programRoutes.put("/:programId", requireRole("super_admin","center_admin"), updateProgramController);
programRoutes.get("/:programId/centers", requireRole("super_admin","center_admin"), programCentersController);

export { programRoutes };
export default centerRoutes;

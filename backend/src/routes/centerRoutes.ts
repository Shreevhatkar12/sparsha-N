import { Router } from "express";
import { requireAuth as authenticate, requireRole } from '../lib/auth.js';
import {
  assignProgramController,
  assignUserController,
  createCenterController,
  deleteCenterController,
  createProgramController,
  getCenterController,
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
centerRoutes.post("/", requireRole("super_admin"), createCenterController);
centerRoutes.delete("/:centerId", requireRole("super_admin"), deleteCenterController);
centerRoutes.put("/:centerId", requireRole("super_admin"), updateCenterController);
centerRoutes.post("/:centerId/programs", requireRole("super_admin"), assignProgramController);
centerRoutes.delete(
  "/:centerId/programs/:programId",
  requireRole("super_admin"),
  removeProgramController,
);
centerRoutes.post("/:centerId/users", requireRole("super_admin"), assignUserController);
centerRoutes.delete("/:centerId/users/:userId", requireRole("super_admin"), removeUserController);

programRoutes.get("/", listProgramsController);
programRoutes.post("/", requireRole("super_admin"), createProgramController);
programRoutes.put("/:programId", requireRole("super_admin"), updateProgramController);
programRoutes.get("/:programId/centers", requireRole("super_admin"), programCentersController);

export { programRoutes };
export default centerRoutes;

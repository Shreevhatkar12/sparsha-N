import { Router } from "express";
import { requireAuth as authenticate, requireRole } from "../lib/auth.ts";
import {
  assignProgramController,
  assignUserController,
  createCenterController,
  createProgramController,
  getCenterController,
  listCentersController,
  listProgramsController,
  programCentersController,
  removeProgramController,
  removeUserController,
  updateCenterController,
  updateProgramController,
} from "../controllers/centerController.ts";

const centerRoutes = Router();
const programRoutes = Router();

centerRoutes.use(authenticate);
programRoutes.use(authenticate);

centerRoutes.get("/", listCentersController);
centerRoutes.get("/:centerId", getCenterController);
centerRoutes.post("/", requireRole("admin"), createCenterController);
centerRoutes.put("/:centerId", requireRole("admin"), updateCenterController);
centerRoutes.post("/:centerId/programs", requireRole("admin"), assignProgramController);
centerRoutes.delete(
  "/:centerId/programs/:programId",
  requireRole("admin"),
  removeProgramController,
);
centerRoutes.post("/:centerId/users", requireRole("admin"), assignUserController);
centerRoutes.delete("/:centerId/users/:userId", requireRole("admin"), removeUserController);

programRoutes.get("/", listProgramsController);
programRoutes.post("/", requireRole("admin"), createProgramController);
programRoutes.put("/:programId", requireRole("admin"), updateProgramController);
programRoutes.get("/:programId/centers", requireRole("admin"), programCentersController);

export { programRoutes };
export default centerRoutes;

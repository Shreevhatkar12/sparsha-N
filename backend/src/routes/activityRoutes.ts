import { Router } from "express";
import { requireAuth as authenticate, requireRole } from "../lib/auth.js";
import {
  listActivitiesController,
  getActivityController,
  createActivityController,
  updateActivityController,
  deleteActivityController,
  assignVolunteerController,
  removeVolunteerAssignmentController,
  getEligibleStudentsController
} from "../controllers/activityController.js";

const activityRoutes = Router();

activityRoutes.use(authenticate);

activityRoutes.get("/", listActivitiesController);
activityRoutes.get("/:activityId", getActivityController);
activityRoutes.post("/", requireRole("admin", "teacher", "staff"), createActivityController);
activityRoutes.put("/:activityId", requireRole("admin", "teacher", "staff"), updateActivityController);
activityRoutes.delete("/:activityId", requireRole("admin"), deleteActivityController);

activityRoutes.post("/:activityId/assign", requireRole("admin", "teacher"), assignVolunteerController);
activityRoutes.delete("/:activityId/assign/:userId", requireRole("admin"), removeVolunteerAssignmentController);

activityRoutes.get("/:activityId/students", getEligibleStudentsController);

export default activityRoutes;

import { Router } from "express";
import { requireAuth as authenticate, requireRole } from '../lib/auth.js';
import {
  listActivitiesController,
  getActivityController,
  createActivityController,
  updateActivityController,
  deleteActivityController,
  assignVolunteerController,
  removeVolunteerAssignmentController,
  getEligibleStudentsController,
  requestActivityEnrollmentController,
  approveActivityEnrollmentController,
  getEnrollmentsController
} from '../controllers/activityController.js';

const activityRoutes = Router();

activityRoutes.use(authenticate);

activityRoutes.get("/", listActivitiesController);
activityRoutes.get("/:activityId", getActivityController);
activityRoutes.post("/", requireRole("super_admin", "teacher", "staff"), createActivityController);
activityRoutes.put("/:activityId", requireRole("super_admin", "teacher", "staff"), updateActivityController);
activityRoutes.delete("/:activityId", requireRole("super_admin"), deleteActivityController);

activityRoutes.post("/:activityId/assign", requireRole("super_admin", "teacher"), assignVolunteerController);
activityRoutes.delete("/:activityId/assign/:userId", requireRole("super_admin"), removeVolunteerAssignmentController);

activityRoutes.get("/:activityId/students", getEligibleStudentsController);

activityRoutes.post("/:activityId/enrollments", requireRole("teacher", "staff", "super_admin"), requestActivityEnrollmentController);
activityRoutes.get("/:activityId/enrollments", getEnrollmentsController);
activityRoutes.put("/:activityId/enrollments/:studentId/approve", requireRole("super_admin"), approveActivityEnrollmentController);

export default activityRoutes;

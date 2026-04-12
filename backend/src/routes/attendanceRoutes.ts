import { Router } from "express";
import { requireAuth as authenticate } from "../lib/auth.ts";
import {
  createAttendanceSession,
  getAttendanceSessionById,
  getAttendanceSessionRecords,
  getAttendanceSessions,
  getAttendanceSummaryController,
  getPendingSessionsController,
  getStudentAttendance,
  updateAttendanceSessionRecords,
} from "../controllers/attendanceController.ts";
import { validate } from "../middleware/validate.ts";
import {
  createAttendanceSessionSchema,
  updateAttendanceSessionRecordsSchema,
} from "../validation/schemas.ts";

const attendanceRoutes = Router();

attendanceRoutes.use(authenticate);

attendanceRoutes.post("/sessions", validate(createAttendanceSessionSchema), createAttendanceSession);
attendanceRoutes.get("/sessions", getAttendanceSessions);
attendanceRoutes.get("/sessions/:sessionId/records", getAttendanceSessionRecords);
attendanceRoutes.get("/sessions/:sessionId", getAttendanceSessionById);
attendanceRoutes.put(
  "/sessions/:sessionId/records",
  validate(updateAttendanceSessionRecordsSchema),
  updateAttendanceSessionRecords,
);
attendanceRoutes.get("/students/:studentId", getStudentAttendance);
attendanceRoutes.get("/summary", getAttendanceSummaryController);
attendanceRoutes.get("/pending", getPendingSessionsController);

export default attendanceRoutes;

import { Router } from "express";
import { requireAuth as authenticate } from "../lib/auth.js";
import {
  createAttendanceSession,
  getAttendanceSessionById,
  getAttendanceSessions,
  getAttendanceSummaryController,
  getPendingSessionsController,
  getStudentAttendance,
  updateAttendanceSessionRecords,
} from "../controllers/attendanceController.js";

const attendanceRoutes = Router();

attendanceRoutes.use(authenticate);

attendanceRoutes.post("/sessions", createAttendanceSession);
attendanceRoutes.get("/sessions", getAttendanceSessions);
attendanceRoutes.get("/sessions/:sessionId", getAttendanceSessionById);
attendanceRoutes.put("/sessions/:sessionId/records", updateAttendanceSessionRecords);
attendanceRoutes.get("/students/:studentId", getStudentAttendance);
attendanceRoutes.get("/summary", getAttendanceSummaryController);
attendanceRoutes.get("/pending", getPendingSessionsController);

export default attendanceRoutes;

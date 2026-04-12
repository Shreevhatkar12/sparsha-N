import { Router } from "express";
import {
  createStudent,
  getAllStudents,
  filterStudents,
  getStudentById,
  getStudentSummary,
  getStudentProfile,
  updateStudent,
  deleteStudent,
  addAttendance,
  getAttendanceByStudent,
  updateAttendance,
  addSkill,
  getSkillsByStudent,
  updateSkill,
  addCareer,
  getCareersByStudent,
  updateCareer,
  getDashboardStats,
} from "../controllers/student.controller.ts";
import { authenticate } from "../middleware/auth.middleware.ts";
import { requireRole } from "../middleware/requireRole.middleware.ts";
import { validate } from "../middleware/validate.ts";
import { createStudentSchema, updateStudentSchema } from "../validation/schemas.ts";

const router = Router();

// All student routes are protected
router.use(authenticate);

router.get("/filter", filterStudents);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Students CRUD
router.post("/", requireRole("admin", "teacher", "staff"), validate(createStudentSchema), createStudent);
router.get("/", getAllStudents);
router.get("/:id/summary", getStudentSummary);
router.get("/:id/profile", getStudentProfile);
router.get("/:id", getStudentById);
router.put("/:id", requireRole("admin", "teacher", "staff"), validate(updateStudentSchema), updateStudent);
router.delete("/:id", requireRole("admin", "teacher"), deleteStudent);

// Attendance
router.post(
  "/:studentId/attendance",
  requireRole("admin", "teacher", "staff"),
  addAttendance,
);
router.get("/:studentId/attendance", getAttendanceByStudent);
router.put(
  "/attendance/:id",
  requireRole("admin", "teacher", "staff"),
  updateAttendance,
);

// Skills
router.post("/:studentId/skills", requireRole("admin", "teacher", "staff"), addSkill);
router.get("/:studentId/skills", getSkillsByStudent);
router.put("/skills/:id", requireRole("admin", "teacher", "staff"), updateSkill);

// Careers
router.post("/:studentId/careers", requireRole("admin", "teacher", "staff"), addCareer);
router.get("/:studentId/careers", getCareersByStudent);
router.put("/careers/:id", requireRole("admin", "teacher", "staff"), updateCareer);

export default router;
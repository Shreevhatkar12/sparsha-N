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
} from '../controllers/student.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.middleware.js';
import { validate } from '../middleware/validate.js';
import { createStudentSchema, updateStudentSchema, createSkillSchema, createCareerSchema } from '../validation/schemas.js';

const router = Router();

// All student routes are protected
router.use(authenticate);

router.get("/filter", filterStudents);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Students CRUD
router.post("/", requireRole("super_admin", "teacher", "staff"), validate(createStudentSchema), createStudent);
router.get("/", getAllStudents);
router.get("/:id/summary", getStudentSummary);
router.get("/:id/profile", getStudentProfile);
router.get("/:id", getStudentById);
router.put("/:id", requireRole("super_admin", "teacher", "staff"), validate(updateStudentSchema), updateStudent);
router.delete("/:id", requireRole("super_admin", "teacher"), deleteStudent);

// Attendance
router.post(
  "/:studentId/attendance",
  requireRole("super_admin", "teacher", "staff"),
  addAttendance,
);
router.get("/:studentId/attendance", getAttendanceByStudent);
router.put(
  "/attendance/:id",
  requireRole("super_admin", "teacher", "staff"),
  updateAttendance,
);

// Skills
router.post("/:studentId/skills", requireRole("super_admin", "teacher", "staff"), validate(createSkillSchema), addSkill);
router.get("/:studentId/skills", getSkillsByStudent);
router.put("/skills/:id", requireRole("super_admin", "teacher", "staff"), validate(createSkillSchema), updateSkill);

// Careers
router.post("/:studentId/careers", requireRole("super_admin", "teacher", "staff"), validate(createCareerSchema), addCareer);
router.get("/:studentId/careers", getCareersByStudent);
router.put("/careers/:id", requireRole("super_admin", "teacher", "staff"), validate(createCareerSchema), updateCareer);

export default router;
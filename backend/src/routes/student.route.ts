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
import { createStudentSchema, updateStudentSchema } from '../validation/schemas.js';

const router = Router();

// 1. All student routes are protected
router.use(authenticate);

// 2. Dashboards (Admins might still want to see stats, but not edit data)
router.get("/filter", filterStudents);
router.get("/dashboard", getDashboardStats);

// 3. Students CRUD (Strictly Teachers and Staff only)
router.post(
  "/", 
  requireRole("teacher", "staff"), 
  validate(createStudentSchema), 
  createStudent
);

// Admins/Super Admins can still "View" the list and profiles for reports
router.get("/", requireRole("super_admin", "center_admin", "teacher", "staff"), getAllStudents);
router.get("/:id/summary", getStudentSummary);
router.get("/:id/profile", getStudentProfile);
router.get("/:id", getStudentById);

// Editing students is restricted to the people handling them
router.put(
  "/:id", 
  requireRole("teacher", "staff"), 
  validate(updateStudentSchema), 
  updateStudent
);

// Delete remains restricted (usually NGO admins handle deletions for data integrity)
router.delete("/:id", requireRole("super_admin", "center_admin","teacher"), deleteStudent);

// 4. Attendance (Daily task for Teachers)
router.post("/:studentId/attendance", requireRole("teacher", "staff"), addAttendance);
router.get("/:studentId/attendance", getAttendanceByStudent);
router.put("/attendance/:id", requireRole("teacher", "staff"), updateAttendance);

// 5. Skills (Pedagogical task for Teachers)
router.post("/:studentId/skills", requireRole("teacher", "staff"), addSkill);
router.get("/:studentId/skills", getSkillsByStudent);
router.put("/skills/:id", requireRole("teacher", "staff"), updateSkill);

// 6. Careers (Guidance task for Teachers)
router.post("/:studentId/careers", requireRole("teacher", "staff"), addCareer);
router.get("/:studentId/careers", getCareersByStudent);
router.put("/careers/:id", requireRole("teacher", "staff"), updateCareer);

export default router;
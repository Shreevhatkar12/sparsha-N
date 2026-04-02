import { Router } from "express";
import {
  createStudent,
  getAllStudents,
  getStudentById,
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
} from "../controllers/student.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

// All student routes are protected
router.use(protect);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Students CRUD
router.post("/", createStudent);
router.get("/", getAllStudents);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

// Attendance
router.post("/:studentId/attendance", addAttendance);
router.get("/:studentId/attendance", getAttendanceByStudent);
router.put("/attendance/:id", updateAttendance);

// Skills
router.post("/:studentId/skills", addSkill);
router.get("/:studentId/skills", getSkillsByStudent);
router.put("/skills/:id", updateSkill);

// Careers
router.post("/:studentId/careers", addCareer);
router.get("/:studentId/careers", getCareersByStudent);
router.put("/careers/:id", updateCareer);

export default router;
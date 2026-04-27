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
  requestTransfer,
  getTransferRequests,
  completeTransfer,
  addFeePayment,
  getFeePayments,
  updateStudentFees,
} from '../controllers/student.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.middleware.js';
import { validate } from '../middleware/validate.js';
import { createStudentSchema, updateStudentSchema, createSkillSchema, createCareerSchema } from '../validators/schemas.js';

const router = Router();

// 1. All student routes are protected
router.use(authenticate);

// 2. Dashboards & Filters (Admins/CEO can view these)
router.get("/filter", filterStudents);
router.get("/dashboard", getDashboardStats);

// 3. Transfer Workflow (NEW FROM VANSH)
router.post(
  "/transfers/request",
  requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"),
  requestTransfer
);
router.get(
  "/transfers/pending",
  requireRole("super_admin", "center_admin", "tech_admin"),
  getTransferRequests
);
router.post(
  "/transfers/complete",
  requireRole("super_admin", "center_admin", "tech_admin"),
  completeTransfer
);

// 4. Students CRUD
router.post(
  "/", 
  requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), 
  validate(createStudentSchema), 
  createStudent
);

// Everyone can view lists and profiles
router.get("/", getAllStudents);
router.get("/:id/summary", getStudentSummary);
router.get("/:id/profile", getStudentProfile);
router.get("/:id", getStudentById);

router.put(
  "/:id", 
  requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), 
  validate(updateStudentSchema), 
  updateStudent
);

// Delete remains restricted to Admins
router.delete("/:id", requireRole("super_admin", "center_admin", "tech_admin"), deleteStudent);

// 5. Attendance
router.post("/:studentId/attendance", requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), addAttendance);
router.get("/:studentId/attendance", getAttendanceByStudent);
router.put("/attendance/:id", requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), updateAttendance);

// 6. Skills
router.post("/:studentId/skills", requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), validate(createSkillSchema), addSkill);
router.get("/:studentId/skills", getSkillsByStudent);
router.put("/skills/:id", requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), validate(createSkillSchema), updateSkill);

// 7. Careers
router.post("/:studentId/careers", requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), validate(createCareerSchema), addCareer);
router.get("/:studentId/careers", getCareersByStudent);
router.put("/careers/:id", requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"), validate(createCareerSchema), updateCareer);

// 8. Fee Management (NEW FROM VANSH)
router.post(
  "/:studentId/fees",
  requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"),
  addFeePayment
);
router.get("/:studentId/fees", getFeePayments);
router.put(
  "/:studentId/fees/update",
  requireRole("super_admin", "tech_admin", "center_admin", "teacher", "staff"),
  updateStudentFees
);

export default router;
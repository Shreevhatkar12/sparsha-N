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
import { 
  createStudentSchema, 
  updateStudentSchema, 
  createSkillSchema, 
  createCareerSchema 
} from '../validation/schemas.js';

const router = Router();

// 1. All student routes are protected
router.use(authenticate);

// 2. Dashboards & Filters (Admins/CEO can view these)
router.get("/filter", filterStudents);
router.get("/dashboard", getDashboardStats);

// 7. Transfer Workflow
router.post(
  "/transfers/request",
  requireRole("teacher", "staff", "super_admin", "center_admin"),
  requestTransfer
);
router.get(
  "/transfers/pending",
  requireRole("super_admin", "center_admin"),
  getTransferRequests
);
router.post(
  "/transfers/complete",
  requireRole("super_admin", "center_admin"),
  completeTransfer
);

// 3. Students CRUD
router.post(
  "/", 
  requireRole("teacher", "staff", "super_admin", "center_admin"),
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
  requireRole("teacher", "staff"), 
  validate(updateStudentSchema), 
  updateStudent
);

// Delete remains restricted to Admins (CEO/Center Head)
router.delete("/:id", requireRole("super_admin", "center_admin"), deleteStudent);

// 4. Attendance (Strictly for the "Ground" team)
router.post(
  "/:studentId/attendance", 
  requireRole("teacher", "staff"), 
  addAttendance
);
router.get("/:studentId/attendance", getAttendanceByStudent);
router.put(
  "/attendance/:id", 
  requireRole("teacher", "staff"), 
  updateAttendance
);

// 5. Skills (Strictly for the "Ground" team)
router.post(
  "/:studentId/skills", 
  requireRole("teacher", "staff"), 
  validate(createSkillSchema), 
  addSkill
);
router.get("/:studentId/skills", getSkillsByStudent);
router.put(
  "/skills/:id", 
  requireRole("teacher", "staff"), 
  validate(createSkillSchema), 
  updateSkill
);

// 6. Careers (Strictly for the "Ground" team)
router.post(
  "/:studentId/careers", 
  requireRole("teacher", "staff"), 
  validate(createCareerSchema), 
  addCareer
);
router.get("/:studentId/careers", getCareersByStudent);
router.put(
  "/careers/:id", 
  requireRole("teacher", "staff"), 
  validate(createCareerSchema), 
  updateCareer
);

// 8. Fee Management
router.post(
  "/:studentId/fees",
  requireRole("teacher", "staff", "super_admin", "center_admin"),
  addFeePayment
);
router.get("/:studentId/fees", getFeePayments);
router.put(
  "/:studentId/fees/update",
  requireRole("teacher", "staff", "super_admin", "center_admin"),
  updateStudentFees
);

export default router;
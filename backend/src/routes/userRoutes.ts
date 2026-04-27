import { Router } from "express";
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  myCentersController,
  resetPasswordController,
  updateUserController,
  updateUserCentersController,
} from '../controllers/userController.js';

const userRoutes = Router();

// 1. All user routes require a valid login
userRoutes.use(authenticate);

// 2. Any logged-in user can see their assigned centers
userRoutes.get("/me/centers", myCentersController);

// 3. User Management - Restricted to Admins
userRoutes.get("/", requireRole("super_admin", "tech_admin", "center_admin"), listUsersController);
userRoutes.get("/:userId", requireRole("super_admin", "tech_admin", "center_admin"), getUserController);
userRoutes.post("/", requireRole("super_admin", "tech_admin", "center_admin"), createUserController);
userRoutes.put("/:userId", requireRole("super_admin", "tech_admin", "center_admin"), updateUserController);
userRoutes.post("/:userId/reset-password", requireRole("super_admin", "tech_admin", "center_admin"), resetPasswordController);

// NEW FROM VANSH: Update which centers a user is assigned to
userRoutes.put("/:userId/centers", requireRole("super_admin", "tech_admin", "center_admin"), updateUserCentersController);

// 4. Deletion
userRoutes.delete("/:userId", requireRole("super_admin", "tech_admin"), deleteUserController);

export default userRoutes;
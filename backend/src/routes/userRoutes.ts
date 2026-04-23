import { Router } from "express";
import { authenticate, requireRole } from '../middleware/auth.middleware.js'; // Use your updated middleware path
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  myCentersController,
  resetPasswordController,
  updateUserController,
} from '../controllers/userController.js';

const userRoutes = Router();

// 1. All user routes require a valid login
userRoutes.use(authenticate);

// 2. Any logged-in user can see their assigned centers
userRoutes.get("/me/centers", myCentersController);

// 3. User Management - Restricted to Super Admin and Center Admin
// Note: We use the exact strings from your Prisma UserRole Enum
userRoutes.get("/", requireRole("super_admin", "center_admin"), listUsersController);
userRoutes.get("/:userId", requireRole("super_admin", "center_admin"), getUserController);
userRoutes.post("/", requireRole("super_admin", "center_admin"), createUserController);
userRoutes.put("/:userId", requireRole("super_admin", "center_admin"), updateUserController);
userRoutes.post("/:userId/reset-password", requireRole("super_admin", "center_admin"), resetPasswordController);

// 4. Deletion - Usually restricted to Super Admin only for safety
userRoutes.delete("/:userId", requireRole("super_admin"), deleteUserController);

export default userRoutes;
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

// 3. User Management 
// We keep your "Center Admin" permissions so they can manage their local staff
userRoutes.get("/", requireRole("super_admin", "center_admin"), listUsersController);
userRoutes.get("/:userId", requireRole("super_admin", "center_admin"), getUserController);
userRoutes.post("/", requireRole("super_admin", "center_admin"), createUserController);
userRoutes.put("/:userId", requireRole("super_admin", "center_admin"), updateUserController);
userRoutes.post("/:userId/reset-password", requireRole("super_admin", "center_admin"), resetPasswordController);
userRoutes.put("/:userId/centers", requireRole("super_admin", "center_admin"), updateUserCentersController);

// 4. Deletion
// Restricted strictly to Super Admin for data integrity/safety
userRoutes.delete("/:userId", requireRole("super_admin"), deleteUserController);

export default userRoutes;
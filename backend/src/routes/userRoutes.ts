import { Router } from "express";
import { requireAuth as authenticate, requireRole } from '../lib/auth.js';
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

userRoutes.use(authenticate);

userRoutes.get("/me/centers", myCentersController);

userRoutes.get("/", requireRole("super_admin"), listUsersController);
userRoutes.get("/:userId", requireRole("super_admin"), getUserController);
userRoutes.post("/", requireRole("super_admin"), createUserController);
userRoutes.put("/:userId", requireRole("super_admin"), updateUserController);
userRoutes.post("/:userId/reset-password", requireRole("super_admin"), resetPasswordController);
userRoutes.delete("/:userId", requireRole("super_admin"), deleteUserController);

export default userRoutes;

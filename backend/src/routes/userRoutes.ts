import { Router } from "express";
import { requireAuth as authenticate, requireRole } from "../lib/auth.js";
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  myCentersController,
  resetPasswordController,
  updateUserController,
} from "../controllers/userController.js";

const userRoutes = Router();

userRoutes.use(authenticate);

userRoutes.get("/me/centers", myCentersController);

userRoutes.get("/", requireRole("admin"), listUsersController);
userRoutes.get("/:userId", requireRole("admin"), getUserController);
userRoutes.post("/", requireRole("admin"), createUserController);
userRoutes.put("/:userId", requireRole("admin"), updateUserController);
userRoutes.post("/:userId/reset-password", requireRole("admin"), resetPasswordController);
userRoutes.delete("/:userId", requireRole("admin"), deleteUserController);

export default userRoutes;

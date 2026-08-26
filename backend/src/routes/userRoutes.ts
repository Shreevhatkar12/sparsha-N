import { Router } from "express";
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { requireCenterAccess } from '../middleware/center.middleware.js';
import { PERMISSIONS } from '../config/rbac.js';
import {
  createUserController,
  deleteUserController,
  permanentDeleteUserController,
  getUserController,
  listUsersController,
  myCentersController,
  reassignUserController,
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
userRoutes.use(requirePermission(PERMISSIONS.MANAGE_USERS));
//userRoutes.use(requireCenterAccess());

userRoutes.get("/", listUsersController);
userRoutes.get("/:userId", getUserController);
userRoutes.post("/", createUserController);
userRoutes.put("/:userId", updateUserController);
userRoutes.post("/:userId/reset-password", resetPasswordController);

// NEW FROM VANSH: Update which centers a user is assigned to
userRoutes.put("/:userId/centers", updateUserCentersController);

// Reuse an inactive (e.g. volunteer) login for a new person: updates name,
// phone, password, roles and centers, then reactivates the same account so
// all historical data tied to this userId stays intact.
userRoutes.post("/:userId/reassign", reassignUserController);

// 4. Deactivation (soft delete — sets isActive: false, keeps all data)
userRoutes.delete("/:userId", deleteUserController);

// 5. Permanent deletion
userRoutes.delete("/:userId/permanent", permanentDeleteUserController);

export default userRoutes;
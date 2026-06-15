import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from '../lib/auth.js';
import { UserRole } from "@prisma/client";
import prisma from '../lib/prisma.js';
import {
  createUser,
  getMyCenters,
  getUserById,
  listUsers,
  resetUserPassword,
  softDeleteUser,
  updateUser,
  updateUserCenters,
} from '../services/userService.js';

type AuthenticatedRequest = Request & { user?: JwtPayload };

export async function listUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = (req as AuthenticatedRequest).user;
    const result = await listUsers({
      role: req.query.role as UserRole | undefined,
      centerId: req.query.centerId as string | undefined,
      isActive:
        typeof req.query.isActive === "string"
          ? req.query.isActive.toLowerCase() === "true"
          : undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      createdBy: (requester?.role === 'super_admin' || requester?.role === 'center_admin')
        ? undefined
        : requester?.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getUserById(req.params.userId as string);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

export async function createUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = (req as AuthenticatedRequest).user;
    const { role: targetRole, centerIds } = req.body as { role: UserRole, centerIds?: string[] };

    if (!requester || !requester.role) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const requesterRole = requester.role as string;

    if (requesterRole === "super_admin") {
      const allowedForSuper = ["super_admin", "center_admin", "tech_admin", "teacher", "staff", "volunteer"];
      if (!allowedForSuper.includes(targetRole)) {
        return res.status(403).json({ success: false, error: "Invalid role assignment for Super Admin." });
      }
    } else if (requesterRole === "center_admin") {
      const allowedForAdmin = ["teacher", "staff", "volunteer"];
      if (!allowedForAdmin.includes(targetRole)) {
        return res.status(403).json({ success: false, error: "Center Admins can only create Teachers, Staff, or Volunteers." });
      }
    } else {
      return res.status(403).json({ success: false, error: "Access Denied." });
    }

    const userData = {
      ...req.body,
      centerIds: centerIds || [],
      createdBy: requester?.userId
    };

    const user = await createUser(userData);
    return res.status(201).json(user);
  } catch (error) {
    console.log("CREATE USER ERROR =>", error);
    return next(error);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    if ("email" in req.body) {
      return res.status(400).json({ success: false, error: "User ID (Email field) cannot be changed once created." });
    }
    if ("password" in req.body || "passwordHash" in req.body) {
      return res.status(400).json({ success: false, error: "Use the Reset Password option to change passwords." });
    }
    const user = await updateUser(req.params.userId as string, req.body);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

export async function resetPasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const { newPassword } = req.body as { newPassword: string };
    const result = await resetUserPassword(req.params.userId as string, newPassword);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = (req as AuthenticatedRequest).user!;
    const targetUser = await getUserById(req.params.userId as string);

    const hierarchy = {
      [UserRole.super_admin]: 3,
      [UserRole.center_admin]: 2,
      [UserRole.teacher]: 1,
      [UserRole.staff]: 0
    };

    const requesterLevel = hierarchy[requester.role as keyof typeof hierarchy] || 0;
    const targetLevel = hierarchy[targetUser.role as keyof typeof hierarchy] || 0;

    if (requesterLevel <= targetLevel && requester.role !== UserRole.super_admin) {
      return res.status(403).json({ success: false, error: "You do not have permission to delete this user." });
    }

    const result = await softDeleteUser(req.params.userId as string, requester);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function permanentDeleteUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = (req as AuthenticatedRequest).user!;

    if (requester.role !== 'super_admin' && requester.role !== 'tech_admin') {
      return res.status(403).json({ success: false, error: "Only Super Admin or Tech Admin can permanently delete users." });
    }

    const userId = req.params.userId as string;

    if (requester.userId === userId) {
      return res.status(400).json({ success: false, error: "You cannot delete your own account." });
    }

    await prisma.userCenterAssignment.deleteMany({ where: { userId: userId } });
    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({ success: true, message: "User permanently deleted." });
  } catch (error) {
    return next(error);
  }
}

export async function myCentersController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getMyCenters((req as AuthenticatedRequest).user!);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateUserCentersController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const requester = (req as AuthenticatedRequest).user!;

    const { assignments } = req.body as {
      assignments: {
        centerId: string;
        programId?: string | null;
      }[];
    };

    if (!Array.isArray(assignments)) {
      return res.status(400).json({
        success: false,
        error: "assignments must be an array",
      });
    }

    const result = await updateUserCenters(
      requester.userId || (requester as any).id,
      req.params.userId as string,
      assignments,
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
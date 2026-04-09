import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "../lib/auth.js";
import type { UserRole } from "@prisma/client";
import {
  createUser,
  getMyCenters,
  getUserById,
  listUsers,
  resetUserPassword,
  softDeleteUser,
  updateUser,
} from "../services/userService.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export async function listUsersController(req: Request, res: Response, next: NextFunction) {
  try {
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
    const user = await createUser(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    if ("email" in req.body) {
      return res.status(400).json({ success: false, error: "Email cannot be changed here" });
    }
    if ("password" in req.body || "passwordHash" in req.body) {
      return res.status(400).json({ success: false, error: "Password cannot be changed here" });
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
    const result = await softDeleteUser(
      req.params.userId as string,
      (req as AuthenticatedRequest).user!,
    );
    return res.status(200).json(result);
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

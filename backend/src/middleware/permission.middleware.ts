import { Request, Response, NextFunction } from "express";
import { ROLE_PERMISSIONS, Permission, Role } from "../config/rbac.js";

export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication is required" });
    }

    // Multi-role: a user is allowed if ANY of their roles grants the permission.
    const roles = [
      req.user.role,
      ...((req.user as { roles?: string[] }).roles || []),
    ] as Role[];
    const allowedPermissions = new Set(
      roles.flatMap((r) => ROLE_PERMISSIONS[r] || []),
    );

    if (!allowedPermissions.has(permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires ${permission} permission`,
      });
    }

    next();
  };
};

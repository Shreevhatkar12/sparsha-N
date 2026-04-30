import { Request, Response, NextFunction } from "express";
import { ADMIN_ROLES, Role } from "../config/rbac.js";

export const requireCenterAccess = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication is required" });
    }

    const userRole = req.user.role as Role;

    // Admin roles bypass center check
    if (ADMIN_ROLES.includes(userRole)) {
      return next();
    }

    // Extract centerId from req.params or req.body or req.query
    const targetCenterId = req.params.centerId || req.body.centerId || req.query.centerId;

    if (!targetCenterId) {
      // If no centerId is provided, we can either allow or rely on scoped queries.
      // Usually, if a specific center operation is done, it has centerId.
      return next();
    }

    const userCenters = req.user.centerIds || [];
    
    if (!userCenters.includes(targetCenterId as string)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this center.",
      });
    }

    next();
  };
};

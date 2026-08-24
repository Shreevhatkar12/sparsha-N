import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JwtPayload } from '../lib/auth.js'; 
import { ADMIN_ROLES, Role } from '../config/rbac.js';

type AuthenticatedRequest = Request & { user?: JwtPayload };

/**
 * AUTHENTICATE: The "Front Gate"
 * Verifies the JWT token and checks if the account is active.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided. Access denied.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    
    // Check if account is still active (Kill-switch)
    if (decoded.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
      });
    }

    // Ensure user has at least one center assigned (unless ANY role is admin)
    const allRoles = [decoded.role, ...((decoded as { roles?: string[] }).roles || [])];
    const isAnyAdmin = allRoles.some((r) => ADMIN_ROLES.includes(r as Role));
    if (!isAnyAdmin && (!decoded.centerIds || decoded.centerIds.length === 0)) {
      return res.status(403).json({
        success: false,
        message: "No centers assigned to user.",
      });
    }

    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export const protect = authenticate;
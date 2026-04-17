import { verifyAccessToken } from '../utils/jwt.js';
import { Request, Response, NextFunction } from "express";
import type { AuthUser } from '../types/index.js';

/**
 * Middleware to protect routes.
 * Expects:  Authorization: Bearer <accessToken>
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
    const decoded = verifyAccessToken(token) as any;
    
    if (decoded.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive.",
      });
    }

    if (decoded.role !== 'super_admin' && (!decoded.centerIds || decoded.centerIds.length === 0)) {
      return res.status(403).json({
        success: false,
        message: "No centers assigned to user.",
      });
    }

    req.user = decoded as AuthUser;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

export const protect = authenticate;
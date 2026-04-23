import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js'; // 1. Added TokenPayload import

// 2. Updated this type to use your real TokenPayload from jwt.ts
type AuthenticatedRequest = Request & { user?: TokenPayload };

/**
 * AUTHENTICATE: The "Front Gate"
 * Checks if the user is logged in (has a valid JWT)
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
    // 3. Changed 'AuthUser' to 'TokenPayload' to match your JWT file
    const decoded = verifyAccessToken(token);
    
    // 4. Using type casting to attach the user data to the request safely
    (req as AuthenticatedRequest).user = decoded; 
    
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

/**
 * AUTHORIZE: The "Internal Door"
 * Checks if the logged-in user has the right Role (e.g., super_admin)
 */
// 5. Added the authorize function below
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user || !allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You do not have the required permissions for this action.",
      });
    }
    next();
  };
};

// 6. Helpful aliases for your route files
export const protect = authenticate;
export const requireRole = authorize;
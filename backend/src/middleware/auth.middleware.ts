import { Request, Response, NextFunction } from "express";
// 1. FIXED: Changed TokenPayload to JwtPayload and imported from your auth file
import { verifyToken, JwtPayload } from '../lib/auth.js'; 

// 2. Ensuring the Request type uses the same JwtPayload definition
type AuthenticatedRequest = Request & { user?: JwtPayload };

/**
 * AUTHENTICATE: The "Front Gate"
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
    // 3. FIXED: Using 'verifyToken' instead of 'verifyAccessToken' to match auth.ts
    const decoded = verifyToken(token);
    
    // 4. Attach the decoded payload (including centerIds) to the request
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
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    // 5. Check if user exists and their role is in the allowed list
    if (!authReq.user || !allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You do not have the required permissions.",
      });
    }
    next();
  };
};

export const protect = authenticate;
export const requireRole = authorize;
import { verifyToken } from "../utils/jwt.js";

/**
 * Middleware to protect routes.
 * Expects:  Authorization: Bearer <accessToken>
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided. Access denied.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

export const protect = authenticate;
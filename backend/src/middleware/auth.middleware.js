import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Middleware to protect routes.
 * Expects:  Authorization: Bearer <accessToken>
 */
export const protect = (req, res, next) => {
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
    req.user = decoded; // { userId, phone, iat, exp }
    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired ? "Token expired. Please refresh." : "Invalid token.",
    });
  }
};
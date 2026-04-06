import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

const ACCESS_TOKEN_EXPIRY = "15m";

/**
 * Generate an access token (short-lived)
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

/**
 * Verify an access token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Verify a refresh token
 */
export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

// Backward-compatible aliases
export const generateAccessToken = generateToken;
export const verifyRefreshToken = verifyToken;
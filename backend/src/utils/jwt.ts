import jwt, { JwtPayload } from "jsonwebtoken";

// ----------------------
// Config
// ----------------------

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or JWT_ACCESS_SECRET must be defined");
}

const ACCESS_TOKEN_EXPIRY = "15m";

// ----------------------
// Types
// ----------------------

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
  centerIds: string[];
}

// ----------------------
// Token Generators
// ----------------------

/**
 * Generate an access token (short-lived)
 */
export const generateToken = (payload: TokenPayload): string => {
  try {
    return jwt.sign(payload, JWT_SECRET as string, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  } catch (err) {
    console.error("Generate Token Error:", err);
    throw err;
  }
};

/**
 * Verify an access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
  } catch (err) {
    console.error("Verify Access Token Error:", err);
    throw err;
  }
};

/**
 * Verify a refresh token
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
  } catch (err) {
    console.error("Verify Refresh Token Error:", err);
    throw err;
  }
};

// ----------------------
// Backward-compatible aliases
// ----------------------

export const generateAccessToken = generateToken;
export const verifyRefreshToken = verifyToken;
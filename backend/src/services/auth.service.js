import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  generateToken,
  verifyToken,
} from "../utils/jwt.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = globalThis.__prismaAuthService ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaAuthService = prisma;
}

const SALT_ROUNDS = 10;

const getCenterIdsByUserId = async (userId) => {
  const assignments = await prisma.userCenterAssignment.findMany({
    where: {
      userId,
      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    },
    select: { centerId: true },
  });

  return assignments.map((a) => a.centerId);
};

/**
 * Register a new user
 */
export const registerUser = async ({ phone, email, password }) => {
  // Check for existing user by phone or email
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ phone }, ...(email ? [{ email }] : [])],
    },
  });

  if (existing) {
    const field = existing.phone === phone ? "phone" : "email";
    const error = new Error(`User with this ${field} already exists`);
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: email || `${phone}@internal.local`,
      passwordHash: hashedPassword,
      fullName: phone || "User",
      role: "staff",
    },
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
  });

  const centerIds = await getCenterIdsByUserId(user.id);
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    centerIds,
  };
  const token = generateToken(tokenPayload);

  return { user: { ...user, centerIds }, token };
};

/**
 * Login with phone (or email) + password
 */
export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const centerIds = await getCenterIdsByUserId(user.id);
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    centerIds,
  };
  const token = generateToken(tokenPayload);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      centerIds,
    },
  };
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (token) => {
  if (!token) {
    const error = new Error("Refresh token required");
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    const error = new Error("Invalid or expired token");
    error.statusCode = 401;
    throw error;
  }

  // Confirm user still exists
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    const error = new Error("User no longer exists");
    error.statusCode = 401;
    throw error;
  }

  const centerIds = await getCenterIdsByUserId(user.id);
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    centerIds,
  };
  const refreshedToken = generateToken(tokenPayload);

  return { token: refreshedToken };
};

/**
 * Get the currently authenticated user's profile
 */
export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const centerIds = await getCenterIdsByUserId(userId);
  return { ...user, centerIds };
};

/**
 * Change password for authenticated user
 */
export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedNew },
  });

  return { message: "Password updated successfully" };
};
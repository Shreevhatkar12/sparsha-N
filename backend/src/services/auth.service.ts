import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.ts";
import { generateToken, verifyToken } from "@/utils/jwt.ts";
import { AppError } from "@/lib/errors.ts";

const SALT_ROUNDS = 10;

// ----------------------
// Types
// ----------------------

type RegisterInput = {
  phone: string;
  email?: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

type TokenPayload = {
  userId: string;
  email: string;
  role: string;
  centerIds: string[];
};

interface CustomError extends Error {
  statusCode?: number;
}

// ----------------------
// Helpers
// ----------------------

const getCenterIdsByUserId = async (userId: string): Promise<string[]> => {
  try {
    const assignments = await prisma.userCenterAssignment.findMany({
      where: {
        userId,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      select: { centerId: true },
    });

    return assignments.map((a) => a.centerId);
  } catch (err) {
    console.error("Error fetching centerIds:", err);
    throw err;
  }
};

// ----------------------
// Services
// ----------------------

/**
 * Register a new user
 */
export const registerUser = async ({
  phone,
  email,
  password,
}: RegisterInput) => {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
    });

    if (existing) {
      const field = existing.phone === phone ? "phone" : "email";
      throw new AppError(`User with this ${field} already exists`, 400);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email || `${phone}@internal.local`,
        passwordHash: hashedPassword,
        fullName: phone || "User",
        role: "staff",
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    const centerIds = await getCenterIdsByUserId(user.id);

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      centerIds,
    };

    const token = generateToken(tokenPayload);

    return { user: { ...user, centerIds }, token };
  } catch (err) {
    console.error("Register Service Error:", err);
    throw err;
  }
};

/**
 * Login with email + password
 */
export const loginUser = async ({ email, password }: LoginInput) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { email: `${email}@internal.local` }, // treat input as phone
        ],
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    const centerIds = await getCenterIdsByUserId(user.id);

    const tokenPayload: TokenPayload = {
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
  } catch (err) {
    console.error("Login Service Error:", err);
    throw err;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (token: string) => {
  try {
    if (!token) {
      throw new AppError("Refresh token is required", 400);
    }

    let decoded: any;

    try {
      decoded = verifyToken(token);
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const centerIds = await getCenterIdsByUserId(user.id);

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      centerIds,
    };

    const refreshedToken = generateToken(tokenPayload);

    return { token: refreshedToken };
  } catch (err) {
    console.error("Refresh Token Service Error:", err);
    throw err;
  }
};

/**
 * Get current user
 */
export const getMe = async (userId: string) => {
  try {
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
      throw new AppError("User not found", 404);
    }

    const centerIds = await getCenterIdsByUserId(userId);

    return { ...user, centerIds };
  } catch (err) {
    console.error("GetMe Service Error:", err);
    throw err;
  }
};

/**
 * Change password
 */
export const changePassword = async (
  userId: string,
  { currentPassword, newPassword }: ChangePasswordInput,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNew },
    });

    return { message: "Password updated successfully" };
  } catch (err) {
    console.error("Change Password Service Error:", err);
    throw err;
  }
};

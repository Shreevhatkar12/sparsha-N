import bcrypt from "bcryptjs";
import prisma from '../lib/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@/utils/jwt.js';
import { AppError } from '@/lib/errors.js';

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
      throw new AppError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email || `${phone}@internal.local`,
        passwordHash: hashedPassword,
        fullName: phone || "User",
        role: "staff",
      },
    });

    const centerIds = await getCenterIdsByUserId(user.id);

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      centerIds,
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
      user: { ...user, centerIds },
    };
  } catch (err) {
    console.error("Register Service Error:", err);
    throw err;
  }
};

// ----------------------

export const loginUser = async ({ email, password }: LoginInput) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) throw new AppError("Invalid credentials", 401);

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) throw new AppError("Invalid credentials", 401);

    const centerIds = await getCenterIdsByUserId(user.id);

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      centerIds,
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        centerIds,
      },
    };
  } catch (err) {
    console.error("Login Service Error:", err);
    throw err;
  }
};

// ----------------------

export const refreshAccessToken = async (token: string) => {
  try {
    if (!token) {
      throw new AppError("Refresh token required", 401);
    }

    const decoded = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const centerIds = await getCenterIdsByUserId(user.id);

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      centerIds,
    };

    return {
      accessToken: generateAccessToken(payload),
    };
  } catch (err) {
    console.error("Refresh Token Service Error:", err);
    throw err;
  }
};

// ----------------------

export const getMe = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new AppError("User not found", 404);

    const centerIds = await getCenterIdsByUserId(userId);

    return { ...user, centerIds };
  } catch (err) {
    console.error("GetMe Service Error:", err);
    throw err;
  }
};

// ----------------------

export const changePassword = async (
  userId: string,
  { currentPassword, newPassword }: ChangePasswordInput,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new AppError("User not found", 404);

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      throw new AppError("Current password incorrect", 400);
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
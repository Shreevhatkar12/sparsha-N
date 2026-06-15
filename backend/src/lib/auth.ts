import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import prisma from './prisma.js';
import { UnauthorizedError } from './errors.js';

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
  centerIds: string[];
  programIds: string[];
  isActive: boolean;
};

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }
  return secret;
}

const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]) ?? "1d";

export async function buildJwtPayload(userId: string): Promise<JwtPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      centerAssignments: {
        where: {
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
        select: { centerId: true, programId: true },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    centerIds: user.centerAssignments.map((a) => a.centerId),
    programIds: user.centerAssignments
      .map((a) => a.programId)
      .filter((id): id is string => id !== null && id !== undefined),
  };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtAccessSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, getJwtAccessSecret()) as JwtPayload;
    return decoded;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Authorization token is required"));
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = decoded;
    return next();
  } catch (error) {
    return next(error);
  }
}
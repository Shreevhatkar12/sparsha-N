import type { AuthUser } from '../types/index.js';
import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import prisma from './prisma.js';
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from './errors.js';

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
  centerIds: string[];
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

const JWT_ACCESS_SECRET = getJwtAccessSecret();
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]) ?? "15m";

export async function buildJwtPayload(userId: string): Promise<JwtPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      centerAssignments: {
        where: { validUntil: null },
        select: { centerId: true },
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
    centerIds: user.centerAssignments.map((assignment) => assignment.centerId),
  };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
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
    req.user = verifyToken(token) as unknown as AuthUser;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as unknown as JwtPayload;

    if (!user) {
      return next(new UnauthorizedError("Authentication is required"));
    }

    if (!roles.includes(user.role)) {
      return next(new ForbiddenError("You do not have permission"));
    }

    return next();
  };
}

export function requireCenterAccess() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return next(new UnauthorizedError("Authentication is required"));
    }

    if (user.role === "super_admin") {
      return next();
    }

    const centerId =
      (req.params.centerId as string | undefined) ??
      (req.body?.centerId as string | undefined);

    if (!centerId) {
      return next(new ValidationError("centerId is required"));
    }

    if (!user.centerIds.includes(centerId)) {
      return next(new ForbiddenError("No access to the requested center"));
    }

    return next();
  };
}

import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from '../lib/auth.js';
import { ForbiddenError } from '../lib/errors.js';
import {
  createCamp,
  updateCamp,
  deleteCamp,
  listCamps,
  getCampRoster,
  sehatDashboard,
} from '../services/sehatService.js';

type AuthenticatedRequest = Request & { user?: JwtPayload };

// sehat = health-camp coordinator role; admins may also access.
const ALLOWED_ROLES = ['sehat', 'super_admin', 'tech_admin'];

function ensureAccess(req: Request): JwtPayload {
  const user = (req as AuthenticatedRequest).user;
  // Multi-role: access is granted if ANY of the user's roles is allowed.
  const roles = user
    ? [String(user.role), ...(((user as { roles?: string[] }).roles) || []).map(String)]
    : [];
  if (!user || !roles.some((r) => ALLOWED_ROLES.includes(r))) {
    throw new ForbiddenError('Sehat panel access is restricted');
  }
  return user;
}

export async function listCampsController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    return res.status(200).json(await listCamps(user));
  } catch (err) {
    return next(err);
  }
}

export async function createCampController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    return res.status(201).json(await createCamp(user, req.body ?? {}));
  } catch (err) {
    return next(err);
  }
}

export async function updateCampController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    return res
      .status(200)
      .json(await updateCamp(user, req.params.id as string, req.body ?? {}));
  } catch (err) {
    return next(err);
  }
}

export async function deleteCampController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    return res.status(200).json(await deleteCamp(user, req.params.id as string));
  } catch (err) {
    return next(err);
  }
}

export async function campRosterController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    return res.status(200).json(await getCampRoster(user, req.params.id as string));
  } catch (err) {
    return next(err);
  }
}

export async function sehatDashboardController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    return res.status(200).json(await sehatDashboard(user));
  } catch (err) {
    return next(err);
  }
}

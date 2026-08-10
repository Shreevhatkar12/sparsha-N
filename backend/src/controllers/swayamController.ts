import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from '../lib/auth.js';
import { ForbiddenError } from '../lib/errors.js';
import {
  listSwayamStudents,
  createSwayamStudent,
  updateSwayamStudent,
  deleteSwayamStudent,
} from '../services/swayamService.js';

type AuthenticatedRequest = Request & { user?: JwtPayload };

// supervisor = "Swayam Coordinator" role; admins may also access by URL.
const ALLOWED_ROLES = ['supervisor', 'super_admin', 'tech_admin'];

function ensureAccess(req: Request): JwtPayload {
  const user = (req as AuthenticatedRequest).user;
  if (!user || !ALLOWED_ROLES.includes(String(user.role))) {
    throw new ForbiddenError('Swayam panel access is restricted');
  }
  return user;
}

export async function listSwayamStudentsController(req: Request, res: Response, next: NextFunction) {
  try {
    ensureAccess(req);
    const data = await listSwayamStudents();
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

export async function createSwayamStudentController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await createSwayamStudent(user, req.body);
    return res.status(201).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function updateSwayamStudentController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await updateSwayamStudent(user, req.params.id as string, req.body);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function deleteSwayamStudentController(req: Request, res: Response, next: NextFunction) {
  try {
    ensureAccess(req);
    await deleteSwayamStudent(req.params.id as string);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

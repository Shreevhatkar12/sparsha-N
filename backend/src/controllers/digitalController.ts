import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from '../lib/auth.js';
import { ForbiddenError } from '../lib/errors.js';
import {
  listDigitalStudents,
  createDigitalStudent,
  updateDigitalStudent,
  deleteDigitalStudent,
  digitalMeta,
  digitalPick,
  listDigitalExams,
  createDigitalExam,
  updateDigitalExam,
  deleteDigitalExam,
} from '../services/digitalService.js';

type AuthenticatedRequest = Request & { user?: JwtPayload };

// volunteer = "Digital Literacy" teacher role; admins may also access.
const ALLOWED_ROLES = ['volunteer', 'super_admin', 'tech_admin'];

function ensureAccess(req: Request): JwtPayload {
  const user = (req as AuthenticatedRequest).user;
  if (!user || !ALLOWED_ROLES.includes(String(user.role))) {
    throw new ForbiddenError('Digital Literacy panel access is restricted');
  }
  return user;
}

export async function listDigitalController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await listDigitalStudents(user);
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

export async function createDigitalController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await createDigitalStudent(user, req.body);
    return res.status(201).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function updateDigitalController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await updateDigitalStudent(user, req.params.id as string, req.body);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDigitalController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const mode = String(req.query.mode ?? 'in');
    await deleteDigitalStudent(user, req.params.id as string, mode);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function digitalMetaController(req: Request, res: Response, next: NextFunction) {
  try {
    ensureAccess(req);
    const data = await digitalMeta();
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

export async function digitalPickController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await digitalPick(
      user,
      String(req.query.programId ?? ''),
      String(req.query.centerId ?? ''),
      String(req.query.standard ?? ''),
    );
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

// ---- Digital Literacy exams -------------------------------------------

export async function listDigitalExamsController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await listDigitalExams(user);
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

export async function createDigitalExamController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await createDigitalExam(user, req.body);
    return res.status(201).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function updateDigitalExamController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await updateDigitalExam(user, req.params.id as string, req.body);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDigitalExamController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    await deleteDigitalExam(user, req.params.id as string);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

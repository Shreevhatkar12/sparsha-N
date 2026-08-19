import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from '../lib/auth.js';
import { ForbiddenError } from '../lib/errors.js';
import {
  listSwayamStudents,
  createSwayamStudent,
  updateSwayamStudent,
  deleteSwayamStudent,
  listDropoutData,
  createDropoutStudent,
  updateDropoutStudent,
  reenrollDropoutStudent,
  updateReenrolledStudent,
  revertReenrolledStudent,
  listSponsorshipData,
  createSponsorshipStudent,
  updateSponsorshipStudent,
  markSponsorshipDone,
  revertSponsorshipStudent,
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

// ---- Dropout tracking -------------------------------------------------

export async function listDropoutController(req: Request, res: Response, next: NextFunction) {
  try {
    ensureAccess(req);
    const data = await listDropoutData();
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

export async function createDropoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await createDropoutStudent(user, req.body);
    return res.status(201).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function updateDropoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await updateDropoutStudent(user, req.params.id as string, req.body);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function reenrollDropoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await reenrollDropoutStudent(user, req.params.id as string, req.body);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function updateReenrolledController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await updateReenrolledStudent(user, req.params.id as string, req.body);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function revertReenrolledController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await revertReenrolledStudent(user, req.params.id as string);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

// ---- Sponsorship / scholarship tracking -------------------------------

export async function listSponsorshipController(req: Request, res: Response, next: NextFunction) {
  try {
    ensureAccess(req);
    const data = await listSponsorshipData();
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

export async function createSponsorshipController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await createSponsorshipStudent(user, req.body);
    return res.status(201).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function updateSponsorshipController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await updateSponsorshipStudent(user, req.params.id as string, req.body);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function markSponsorshipDoneController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await markSponsorshipDone(user, req.params.id as string);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function revertSponsorshipController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = ensureAccess(req);
    const data = await revertSponsorshipStudent(user, req.params.id as string);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

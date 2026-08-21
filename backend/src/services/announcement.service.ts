import prisma from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

// ----------------------------------------------------------------------
// ANNOUNCEMENTS with center + program targeting (zero migration).
// Targeting lives inside the existing targetRoles String[] column as tokens:
//   'center:<uuid>'  → targeted center  (multiple allowed)
//   'program:<uuid>' → targeted program (multiple allowed)
//   plain values     → legacy role names (backward compatible)
// No tokens at all = visible to EVERYONE.
// Visibility is enforced server-side, so non-targeted users never even
// receive the announcement (privacy).
// ----------------------------------------------------------------------

interface AnnouncementInput {
  title?: string;
  body?: string;
  targetRoles?: string[];
  isPinned?: boolean;
  expiresAt?: string | Date | null;
}

type Ctx = { userId: string; role: string; allowedCenterIds: string[] };

const MANAGER_ROLES = ['super_admin', 'tech_admin', 'center_admin'];

function parseTargets(tokens: string[] | null | undefined) {
  const centers: string[] = [];
  const programs: string[] = [];
  const roles: string[] = [];
  for (const t of tokens ?? []) {
    if (typeof t !== 'string') continue;
    if (t.startsWith('center:')) centers.push(t.slice('center:'.length));
    else if (t.startsWith('program:')) programs.push(t.slice('program:'.length));
    else roles.push(t);
  }
  return { centers, programs, roles };
}

// Which programs does this user "belong to"? Used to match program-targeted
// announcements.
async function programIdsForUser(
  role: string,
  userId: string,
  centerIds: string[],
): Promise<Set<string>> {
  if (role === 'volunteer') {
    const ps = await prisma.program.findMany({
      where: { name: { equals: 'Digital Literacy', mode: 'insensitive' } },
      select: { id: true },
    });
    return new Set(ps.map((p) => p.id));
  }
  if (role === 'supervisor') {
    const ps = await prisma.program.findMany({
      where: {
        OR: [
          { name: { contains: 'swayam 2', mode: 'insensitive' } },
          {
            name: {
              in: ['Dropout Students', 'Re-enrolled Students', 'Sponsorship & Scholarship Students'],
            },
          },
        ],
      },
      select: { id: true },
    });
    return new Set(ps.map((p) => p.id));
  }
  if (role === 'teacher') {
    const rows = await prisma.student.findMany({
      where: { createdById: userId, isActive: true },
      select: { programId: true },
      distinct: ['programId'],
    });
    return new Set(rows.map((r) => r.programId).filter((x): x is string => !!x));
  }
  // center_admin / staff — every program running in their centers
  const rows = await prisma.student.findMany({
    where: { centerId: { in: centerIds }, isActive: true },
    select: { programId: true },
    distinct: ['programId'],
  });
  return new Set(rows.map((r) => r.programId).filter((x): x is string => !!x));
}

export const createAnnouncement = async (data: AnnouncementInput, ctx: Ctx) => {
  if (!MANAGER_ROLES.includes(ctx.role)) {
    throw new AppError('Not authorized to post announcements', 403);
  }
  const title = String(data.title ?? '').trim();
  const body = String(data.body ?? '').trim();
  if (!title || !body) throw new AppError('Title and content are required', 400);

  let tokens = Array.isArray(data.targetRoles)
    ? data.targetRoles.filter((t) => typeof t === 'string')
    : [];
  const { centers } = parseTargets(tokens);

  // center_admin can never broadcast outside their own centers.
  if (ctx.role === 'center_admin') {
    if (centers.length === 0) {
      tokens = [...tokens, ...ctx.allowedCenterIds.map((c) => `center:${c}`)];
    } else if (centers.some((c) => !ctx.allowedCenterIds.includes(c))) {
      throw new AppError('Cannot target centers you do not manage', 403);
    }
  }

  return prisma.announcement.create({
    data: {
      title,
      body,
      targetRoles: tokens,
      isPinned: !!data.isPinned,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy: ctx.userId,
    },
  });
};

export const listAnnouncements = async (ctx: Ctx, _cursor?: string) => {
  const anns = await prisma.announcement.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  // Super/tech admin manage everything — they see all announcements.
  if (ctx.role === 'super_admin' || ctx.role === 'tech_admin') return anns;

  const myPrograms = await programIdsForUser(ctx.role, ctx.userId, ctx.allowedCenterIds);

  return anns.filter((a) => {
    const { centers, programs, roles } = parseTargets(a.targetRoles);
    // Legacy single-column targeting folds in as an extra restriction.
    const effCenters = centers.length ? centers : a.centerId ? [a.centerId] : [];
    const effPrograms = programs.length ? programs : a.programId ? [a.programId] : [];
    if (roles.length && !roles.includes(ctx.role)) return false;
    if (effCenters.length && !effCenters.some((c) => ctx.allowedCenterIds.includes(c))) return false;
    if (effPrograms.length && !effPrograms.some((p) => myPrograms.has(p))) return false;
    return true;
  });
};

function ensureManageAccess(
  role: string,
  allowedCenterIds: string[],
  existingTokens: string[] | null,
  existingCenterId: string | null,
) {
  if (role === 'super_admin' || role === 'tech_admin') return;
  if (role !== 'center_admin') throw new AppError('Not authorized', 403);
  const { centers } = parseTargets(existingTokens ?? []);
  const eff = centers.length ? centers : existingCenterId ? [existingCenterId] : [];
  if (eff.length === 0 || eff.some((c) => !allowedCenterIds.includes(c))) {
    throw new AppError('Not authorized to manage this announcement', 403);
  }
}

export const updateAnnouncement = async (id: string, data: AnnouncementInput, ctx: Ctx) => {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new AppError('Announcement not found', 404);
  ensureManageAccess(ctx.role, ctx.allowedCenterIds, existing.targetRoles, existing.centerId);

  let tokens = Array.isArray(data.targetRoles)
    ? data.targetRoles.filter((t) => typeof t === 'string')
    : undefined;
  if (tokens && ctx.role === 'center_admin') {
    const { centers } = parseTargets(tokens);
    if (centers.length === 0) {
      tokens = [...tokens, ...ctx.allowedCenterIds.map((c) => `center:${c}`)];
    } else if (centers.some((c) => !ctx.allowedCenterIds.includes(c))) {
      throw new AppError('Cannot target centers you do not manage', 403);
    }
  }

  return prisma.announcement.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: String(data.title).trim() } : {}),
      ...(data.body !== undefined ? { body: String(data.body).trim() } : {}),
      ...(tokens !== undefined ? { targetRoles: tokens } : {}),
      ...(data.isPinned !== undefined ? { isPinned: !!data.isPinned } : {}),
      ...(data.expiresAt !== undefined
        ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }
        : {}),
    },
  });
};

export const deleteAnnouncement = async (
  id: string,
  { role, allowedCenterIds }: { role: string; allowedCenterIds: string[] },
) => {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new AppError('Announcement not found', 404);
  ensureManageAccess(role, allowedCenterIds, existing.targetRoles, existing.centerId);

  return prisma.announcement.delete({ where: { id } });
};

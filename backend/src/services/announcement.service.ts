import prisma from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { buildCursorPagination, centerScopeWhere } from '../utils/queryHelpers.js';

interface CreateAnnouncementData {
  title: string;
  body: string;
  targetRoles: string[];
  isPinned?: boolean;
  expiresAt?: Date;
  centerId?: string;
  programId?: string;
}

export const createAnnouncement = async (
  data: CreateAnnouncementData,
  { userId, role, allowedCenterIds }: { userId: string; role: string; allowedCenterIds: string[] }
) => {
  if (role !== 'super_admin' && !data.centerId) {
    throw new AppError('Center ID is required for non-super_admin roles', 400);
  }
  
  if (data.centerId && role !== 'super_admin' && !allowedCenterIds.includes(data.centerId)) {
    throw new AppError('Cannot create announcement for unauthorized center', 403);
  }

  const announcement = await prisma.announcement.create({
    data: {
      ...data,
      createdBy: userId,
    },
  });

  return announcement;
};

export const listAnnouncements = async (
  { role, allowedCenterIds, programId }: { role: string; allowedCenterIds: string[]; programId?: string },
  cursor?: string
) => {
  const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { centerId: null },
          { centerId: { in: allowedCenterIds } },
          ...(role === 'super_admin' ? [{}] : [])
        ],
        ...(role !== 'super_admin' ? { targetRoles: { has: role } } : {}),
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
        ],
        ...(programId ? { programId } : {})
      },
    ...buildCursorPagination(cursor, 50),
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  return announcements;
};

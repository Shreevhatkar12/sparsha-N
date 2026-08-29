import type { Prisma, UserActivityAssignment } from "@prisma/client";
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';
import type { JwtPayload } from '../lib/auth.js';
import { centerScope } from '../lib/centerScope.js';

type ListActivitiesParams = {
  centerId?: string;
  programId?: string;
  from?: string;
  to?: string;
  search?: string;
};

// The activity's real-world status is derived from today's date vs its
// start/end date, not from a value someone has to remember to update by
// hand. "cancelled" is the one exception — once an activity is cancelled it
// stays cancelled regardless of dates.
function computeActivityStatus<T extends { startDate: Date | null; endDate: Date | null; status: string }>(
  activity: T,
): T {
  if (activity.status === "cancelled") {
    return activity;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = activity.startDate ? new Date(activity.startDate) : null;
  const end = activity.endDate ? new Date(activity.endDate) : start;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(0, 0, 0, 0);

  let status = activity.status;
  if (start && today < start) {
    status = "planned";
  } else if (end && today > end) {
    status = "completed";
  } else if (start && today >= start) {
    status = "ongoing";
  }

  return { ...activity, status };
}

export async function listActivities(user: JwtPayload, params: ListActivitiesParams) {
  const { centerId, programId, from, to, search } = params;
  const where: Prisma.ActivityWhereInput = {};
  if (user.role !== "super_admin") {
    where.centerId = { in: user.centerIds };
  }

  if (centerId) {
    if (user.role !== "super_admin" && !user.centerIds.includes(centerId)) {
      throw new ForbiddenError("No access to this center");
    }
    where.centerId = centerId;
  }

  if (programId) {
    where.programId = programId;
  }

  if (from || to) {
    where.startDate = {};
    if (from) where.startDate.gte = new Date(from);
    if (to) where.startDate.lte = new Date(to);
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  // Volunteer specific logic
  if (user.role === "volunteer") {
    const today = new Date();
    // Only return activities assigned to this volunteer
    where.userAssignments = {
      some: {
        userId: user.userId,
        validFrom: { lte: today },
        OR: [
          { validUntil: null },
          { validUntil: { gte: today } }
        ]
      }
    };
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      program: { select: { name: true } },
      center: { select: { name: true } },
      createdByUser: { select: { fullName: true } },
      updatedByUser: { select: { fullName: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return activities.map(computeActivityStatus);
}

export async function getActivity(user: JwtPayload, activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      userAssignments: {
        include: {
          user: {
            select: { fullName: true, role: true, email: true },
          },
        },
      },
      _count: {
        select: { attendanceSessions: true },
      },
    },
  });

  if (!activity) {
    throw new NotFoundError("Activity not found");
  }

  // Access check
  if (user.role !== "super_admin") {
    // Is the user in the center?
    const inCenter = user.centerIds.includes(activity.centerId);
    
    // Is the user directly assigned to this activity?
    const assigned = activity.userAssignments.some((a: UserActivityAssignment) => a.userId === user.userId);

    if (!inCenter && !assigned) {
      throw new ForbiddenError("Access to this activity is denied");
    }
  }

  return computeActivityStatus(activity);
}

export async function createActivity(user: JwtPayload, data: { centerIds: string[]; programId?: string; name: string; description?: string; volunteers?: string[]; startDate?: string | Date; endDate?: string | Date; startTime?: string; endTime?: string }) {
  const { centerIds, programId, name, description, volunteers, startDate, endDate, startTime, endTime } = data;

  if (!centerIds || !centerIds.length || !name) {
    throw new ValidationError("centerIds and name are required");
  }

  for (const centerId of centerIds) {
    if (user.role !== "super_admin" && !user.centerIds.includes(centerId)) {
      throw new ForbiddenError("No access to create activity in this center");
    }
  }

  const createdActivities = [];
  for (const centerId of centerIds) {
    const activity = await prisma.activity.create({
      data: {
        centerId,
        programId,
        name,
        description,
        volunteers: volunteers || [],
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        createdBy: user.userId,
      },
    });
    createdActivities.push(activity);
  }

  return createdActivities;
}

export async function updateActivity(user: JwtPayload, activityId: string, data: { name?: string; description?: string; startDate?: string | Date; endDate?: string | Date; startTime?: string; endTime?: string; volunteers?: string[] }) {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  
  if (!activity) {
    throw new NotFoundError("Activity not found");
  }

  if (user.role !== "super_admin" && !user.centerIds.includes(activity.centerId)) {
    throw new ForbiddenError("No access to update this activity");
  }

  const { name, description, startDate, endDate, startTime, endTime, volunteers } = data;

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(startTime !== undefined && { startTime: startTime || null }),
      ...(endTime !== undefined && { endTime: endTime || null }),
      ...(volunteers !== undefined && { volunteers }),
      updatedBy: user.userId,
    },
    include: {
      createdByUser: { select: { fullName: true } },
      updatedByUser: { select: { fullName: true } },
    },
  });

  return computeActivityStatus(updated);
}

export async function getActivityReport(user: JwtPayload, activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      center: { select: { name: true } },
      program: { select: { name: true } },
      createdByUser: { select: { fullName: true } },
      updatedByUser: { select: { fullName: true } },
    },
  });

  if (!activity) {
    throw new NotFoundError("Activity not found");
  }

  if (user.role !== "super_admin" && !user.centerIds.includes(activity.centerId)) {
    throw new ForbiddenError("No access to this activity");
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: { activityId },
    include: {
      records: {
        include: {
          student: { select: { gender: true, standard: true, fullName: true } },
        },
      },
    },
    orderBy: { sessionDate: "asc" },
  });

  let presentCount = 0;
  let absentCount = 0;
  const genderBreakdown: Record<string, { present: number; total: number }> = {
    male: { present: 0, total: 0 },
    female: { present: 0, total: 0 },
  };
  const stdMap = new Map<string, { present: number; total: number }>();

  for (const session of sessions) {
    for (const record of session.records) {
      const isPresent = record.status === "present" || record.status === "late";
      if (isPresent) presentCount++;
      else if (record.status === "absent") absentCount++;

      const gender = record.student?.gender;
      if (gender === "male" || gender === "female") {
        genderBreakdown[gender].total++;
        if (isPresent) genderBreakdown[gender].present++;
      }

      const std = record.student?.standard || "Unspecified";
      const s = stdMap.get(std) ?? { present: 0, total: 0 };
      s.total++;
      if (isPresent) s.present++;
      stdMap.set(std, s);
    }
  }

  const stdBreakdown = Array.from(stdMap.entries())
    .map(([standard, v]) => ({ standard, ...v }))
    .sort((a, b) => a.standard.localeCompare(b.standard, undefined, { numeric: true }));

  return {
    activity: {
      id: activity.id,
      name: activity.name,
      description: activity.description,
      startDate: activity.startDate,
      endDate: activity.endDate,
      startTime: activity.startTime,
      endTime: activity.endTime,
      center: activity.center?.name,
      program: activity.program?.name,
      createdByName: activity.createdByUser?.fullName || null,
      updatedByName: activity.updatedByUser?.fullName || null,
      volunteers: activity.volunteers,
    },
    presentCount,
    absentCount,
    genderBreakdown,
    stdBreakdown,
    sessionDates: sessions.map((s) => s.sessionDate),
  };
}

export async function deleteActivity(user: JwtPayload, activityId: string) {
  // Check if activity exists
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { _count: { select: { attendanceSessions: true } } },
  });

  if (!activity) {
    throw new NotFoundError("Activity not found");
  }

  if (user.role !== "super_admin") {
    throw new ForbiddenError("Only admins can delete activities");
  }

  if (activity._count.attendanceSessions > 0) {
    throw new ValidationError("Cannot delete activity with linked attendance sessions");
  }

  // Delete all assignments first
  await prisma.userActivityAssignment.deleteMany({
    where: { activityId },
  });

  // Hard delete activity (as per schema)
  return prisma.activity.delete({
    where: { id: activityId },
  });
}

export async function assignVolunteer(activityId: string, data: { userId: string; validFrom: string | Date; validUntil?: string | Date }, createdBy: string) {
  const { userId, validFrom, validUntil } = data;

  if (!userId || !validFrom) {
    throw new ValidationError("userId and validFrom are required");
  }

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) {
    throw new NotFoundError("Activity not found");
  }

  // Upsert or find-first-then-update/create since no unique constraint on (userId, activityId) exists in the schema.
  // Wait, let's check if there is a unique constraint in the schema for UserActivityAssignment:
  // There is no @@unique([userId, activityId]) in the schema for UserActivityAssignment!
  // So we must check if an assignment already exists manually.

  const existing = await prisma.userActivityAssignment.findFirst({
    where: { userId, activityId },
  });

  if (existing) {
    return prisma.userActivityAssignment.update({
      where: { id: existing.id },
      data: {
        validFrom: new Date(validFrom),
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });
  }

  return prisma.userActivityAssignment.create({
    data: {
      userId,
      activityId,
      validFrom: new Date(validFrom),
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy,
    },
  });
}

export async function removeVolunteerAssignment(activityId: string, userId: string) {
  const existing = await prisma.userActivityAssignment.findFirst({
    where: { userId, activityId },
  });

  if (!existing) {
    throw new NotFoundError("Assignment not found");
  }

  return prisma.userActivityAssignment.delete({
    where: { id: existing.id },
  });
}

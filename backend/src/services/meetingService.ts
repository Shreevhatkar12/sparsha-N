import prisma from '../lib/prisma.js';

export async function testMeetingService() {
  return {
    success: true,
    message: 'Meeting Service Working',
  };
}

export async function getMeetingStats() {
  const studentMeetings = await prisma.studentMeeting.count();
  const parentMeetings = await prisma.parentMeeting.count();
  return {
    studentMeetings,
    parentMeetings,
  };
}

export async function createStudentMeeting(userId: string, data: any) {
  const meeting = await prisma.studentMeeting.create({
    data: {
      centerId: data.centerId,
      programId: data.programId,
      standard: data.standard,
      meetingDate: new Date(data.meetingDate),
      meetingTime: data.meetingTime || null,
      topic: data.topic,
      description: data.description || null,
      createdBy: userId,
    },
  });

  // Save attendance rows (was previously dropped → "Students: 0").
  if (Array.isArray(data.attendance) && data.attendance.length > 0) {
    await prisma.studentMeetingAttendance.createMany({
      data: data.attendance
        .filter((a: any) => a && a.studentId)
        .map((a: any) => ({
          meetingId: meeting.id,
          studentId: a.studentId,
          isPresent: !!a.isPresent,
        })),
      skipDuplicates: true,
    });
  }

  return meeting;
}

export async function updateStudentMeeting(id: string, data: any) {
  const meeting = await prisma.studentMeeting.update({
    where: { id },
    data: {
      ...(data.centerId ? { centerId: data.centerId } : {}),
      ...(data.programId ? { programId: data.programId } : {}),
      ...(data.standard !== undefined ? { standard: data.standard } : {}),
      ...(data.meetingDate ? { meetingDate: new Date(data.meetingDate) } : {}),
      ...(data.meetingTime !== undefined ? { meetingTime: data.meetingTime || null } : {}),
      ...(data.topic ? { topic: data.topic } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
    },
  });

  // Replace attendance if a fresh list is provided.
  if (Array.isArray(data.attendance)) {
    await prisma.studentMeetingAttendance.deleteMany({ where: { meetingId: id } });
    if (data.attendance.length > 0) {
      await prisma.studentMeetingAttendance.createMany({
        data: data.attendance
          .filter((a: any) => a && a.studentId)
          .map((a: any) => ({
            meetingId: id,
            studentId: a.studentId,
            isPresent: !!a.isPresent,
          })),
        skipDuplicates: true,
      });
    }
  }

  return meeting;
}

export async function deleteStudentMeeting(id: string) {
  await prisma.studentMeetingAttendance.deleteMany({ where: { meetingId: id } });
  await prisma.studentMeeting.delete({ where: { id } });
  return { success: true };
}

export async function listStudentMeetings(user: any, filters?: any) {
  const where: any = {};
  
  if (user.role === 'teacher' || user.role === 'center_admin') {
    where.centerId = { in: user.centerIds };
  }
  if (filters?.centerId) where.centerId = filters.centerId;
  if (filters?.programId) where.programId = filters.programId;

  return prisma.studentMeeting.findMany({
    where,
    include: {
      center: { select: { id: true, name: true } },
      program: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, fullName: true } },
      attendance: true,
    },
    orderBy: { meetingDate: 'desc' },
  });
}

export async function getStudentMeetingById(id: string) {
  return prisma.studentMeeting.findUnique({
    where: { id },
    include: {
      center: { select: { id: true, name: true } },
      program: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, fullName: true } },
      attendance: {
        include: {
          student: { select: { id: true, fullName: true, gender: true, rollNumber: true } },
        },
      },
    },
  });
}

export async function createParentMeeting(userId: string, data: any) {
  const meeting = await prisma.parentMeeting.create({
    data: {
      centerId: data.centerId,
      programId: data.programId,
      standard: data.standard,
      meetingDate: new Date(data.meetingDate),
      meetingTime: data.meetingTime || null,
      topic: data.topic,
      description: data.description || null,
      createdBy: userId,
    },
  });

  if (data.parents && Array.isArray(data.parents) && data.parents.length > 0) {
    await prisma.parentMeetingAttendance.createMany({
      data: data.parents.map((p: any) => ({
        meetingId: meeting.id,
        parentName: p.parentName,
        gender: p.gender,
      })),
    });
  }

  return meeting;
}

export async function updateParentMeeting(id: string, data: any) {
  const meeting = await prisma.parentMeeting.update({
    where: { id },
    data: {
      ...(data.centerId ? { centerId: data.centerId } : {}),
      ...(data.programId ? { programId: data.programId } : {}),
      ...(data.standard !== undefined ? { standard: data.standard } : {}),
      ...(data.meetingDate ? { meetingDate: new Date(data.meetingDate) } : {}),
      ...(data.meetingTime !== undefined ? { meetingTime: data.meetingTime || null } : {}),
      ...(data.topic ? { topic: data.topic } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
    },
  });

  if (Array.isArray(data.parents)) {
    await prisma.parentMeetingAttendance.deleteMany({ where: { meetingId: id } });
    if (data.parents.length > 0) {
      await prisma.parentMeetingAttendance.createMany({
        data: data.parents
          .filter((p: any) => p && p.parentName)
          .map((p: any) => ({ meetingId: id, parentName: p.parentName, gender: p.gender })),
      });
    }
  }

  return meeting;
}

export async function deleteParentMeeting(id: string) {
  await prisma.parentMeetingAttendance.deleteMany({ where: { meetingId: id } });
  await prisma.parentMeeting.delete({ where: { id } });
  return { success: true };
}

export async function listParentMeetings(user: any, filters?: any) {
  const where: any = {};

  if (user.role === 'teacher' || user.role === 'center_admin') {
    where.centerId = { in: user.centerIds };
  }
  if (filters?.centerId) where.centerId = filters.centerId;
  if (filters?.programId) where.programId = filters.programId;

  return prisma.parentMeeting.findMany({
    where,
    include: {
      center: { select: { id: true, name: true } },
      program: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, fullName: true } },
      attendance: true,
    },
    orderBy: { meetingDate: 'desc' },
  });
}

export async function getParentMeetingById(id: string) {
  return prisma.parentMeeting.findUnique({
    where: { id },
    include: {
      center: { select: { id: true, name: true } },
      program: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, fullName: true } },
      attendance: true,
    },
  });
}
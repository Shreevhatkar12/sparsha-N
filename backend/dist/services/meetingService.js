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
export async function createStudentMeeting(userId, data) {
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
    return meeting;
}
export async function listStudentMeetings(user, filters) {
    const where = {};
    if (user.role === 'teacher' || user.role === 'center_admin') {
        where.centerId = { in: user.centerIds };
    }
    if (filters?.centerId)
        where.centerId = filters.centerId;
    if (filters?.programId)
        where.programId = filters.programId;
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
export async function getStudentMeetingById(id) {
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
export async function createParentMeeting(userId, data) {
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
            data: data.parents.map((p) => ({
                meetingId: meeting.id,
                parentName: p.parentName,
                gender: p.gender,
            })),
        });
    }
    return meeting;
}
export async function listParentMeetings(user, filters) {
    const where = {};
    if (user.role === 'teacher' || user.role === 'center_admin') {
        where.centerId = { in: user.centerIds };
    }
    if (filters?.centerId)
        where.centerId = filters.centerId;
    if (filters?.programId)
        where.programId = filters.programId;
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
export async function getParentMeetingById(id) {
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

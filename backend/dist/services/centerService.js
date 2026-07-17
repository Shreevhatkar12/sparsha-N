import { Prisma } from "@prisma/client";
import prisma from '../lib/prisma.js';
import { AppError, NotFoundError } from '../lib/errors.js';
function activeAssignmentWhere(userId) {
    return {
        ...(userId ? { userId } : {}),
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    };
}
export async function listCenters(user) {
    // Temporary: Just fetch all active centers to see if they show up
    const centers = await prisma.center.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
            centerPrograms: {
                where: { isActive: true },
                include: { program: true },
            },
        },
    });
    console.log("Total centers found in DB:", centers.length);
    return centers; // This matches your frontend mapping
}
export async function getCenterDetails(user, centerId) {
    const requesterId = user.userId || user.id;
    // 1. Permission Check — Admins see all centers
    if (user.role !== "super_admin" && user.role !== "center_admin") {
        const isAssigned = await prisma.userCenterAssignment.findFirst({
            where: {
                centerId,
                userId: requesterId,
                ...activeAssignmentWhere(),
            },
        });
        if (!isAssigned) {
            throw new NotFoundError("Center"); // Or ForbiddenError
        }
    }
    // 2. Fetch Data
    const center = await prisma.center.findUnique({
        where: { id: centerId },
        include: {
            centerPrograms: {
                where: { isActive: true },
                include: { program: true },
            },
        },
    });
    if (!center)
        throw new NotFoundError("Center");
    // 3. Fetch teachers/staff assigned to this center
    const assignments = await prisma.userCenterAssignment.findMany({
        where: {
            centerId,
            ...activeAssignmentWhere(),
        },
        include: {
            user: {
                select: { id: true, fullName: true, email: true, role: true, isActive: true },
            },
        },
    });
    const teachers = assignments
        .filter((a) => ['teacher', 'staff'].includes(a.user.role))
        .map((a) => a.user);
    // 4. Fetch students enrolled in this center
    const students = await prisma.student.findMany({
        where: { centerId, isActive: true },
        select: { id: true, fullName: true, rollNumber: true, programId: true, createdById: true },
        orderBy: { fullName: 'asc' },
        take: 200,
    });
    const studentCount = await prisma.student.count({
        where: { centerId, isActive: true },
    });
    return {
        ...center,
        teachers,
        students,
        userCount: teachers.length,
        studentCount,
    };
}
export async function createCenter(input) {
    return prisma.center.create({
        data: {
            name: input.name,
            location: input.location ?? null,
        },
    });
}
export async function deleteCenter(centerId) {
    const activeStudents = await prisma.student.count({
        where: { centerId, isActive: true },
    });
    if (activeStudents > 0) {
        throw new AppError("Cannot delete center with active students", 409);
    }
    // First delete all related records
    await prisma.userCenterAssignment.deleteMany({ where: { centerId } });
    await prisma.centerProgram.deleteMany({ where: { centerId } });
    return prisma.center.delete({
        where: { id: centerId },
    });
}
export async function updateCenter(centerId, input) {
    await prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    return prisma.center.update({
        where: { id: centerId },
        data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
    });
}
export async function assignProgramToCenter(centerId, programId) {
    await prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    await prisma.program.findUniqueOrThrow({ where: { id: programId } });
    const existing = await prisma.centerProgram.findFirst({
        where: { centerId, programId },
    });
    if (!existing) {
        return prisma.centerProgram.create({
            data: { centerId, programId, isActive: true },
        });
    }
    if (!existing.isActive) {
        return prisma.centerProgram.update({
            where: { id: existing.id },
            data: { isActive: true },
        });
    }
    return existing;
}
export async function removeProgramFromCenter(centerId, programId) {
    const centerProgram = await prisma.centerProgram.findFirst({
        where: { centerId, programId },
    });
    if (!centerProgram)
        throw new NotFoundError("Center program mapping");
    const activeStudents = await prisma.student.count({
        where: { centerId, programId, isActive: true },
    });
    if (activeStudents > 0) {
        throw new AppError("Cannot remove program while active students exist", 409);
    }
    return prisma.centerProgram.update({
        where: { id: centerProgram.id },
        data: { isActive: false },
    });
}
export async function assignUserToCenter(createdBy, centerId, input) {
    await prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
    const validFrom = input.validFrom ? new Date(input.validFrom) : undefined;
    const validUntil = input.validUntil ? new Date(input.validUntil) : null;
    const existing = await prisma.userCenterAssignment.findFirst({
        where: { centerId, userId: input.userId },
    });
    if (!existing) {
        return prisma.userCenterAssignment.create({
            data: {
                centerId,
                userId: input.userId,
                createdBy,
                ...(validFrom ? { validFrom } : {}),
                validUntil,
            },
        });
    }
    return prisma.userCenterAssignment.update({
        where: { id: existing.id },
        data: {
            ...(validFrom ? { validFrom } : {}),
            validUntil,
        },
    });
}
export async function removeUserFromCenter(centerId, userId) {
    const assignment = await prisma.userCenterAssignment.findFirst({
        where: { centerId, userId },
    });
    if (!assignment)
        throw new NotFoundError("User center assignment");
    return prisma.userCenterAssignment.update({
        where: { id: assignment.id },
        data: { validUntil: new Date() },
    });
}
export async function listPrograms() {
    return prisma.program.findMany({
        where: { isActive: true },
        select: {
            id: true,
            code: true,
            name: true,
            ageMin: true,
            ageMax: true,
            description: true,
        },
        orderBy: { name: "asc" },
    });
}
export async function createProgram(input) {
    try {
        return await prisma.program.create({
            data: {
                code: input.code,
                name: input.name,
                ageMin: input.ageMin ?? null,
                ageMax: input.ageMax ?? null,
                description: input.description ?? null,
            },
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError("Program code must be unique", 409);
        }
        throw error;
    }
}
export async function updateProgram(programId, input) {
    await prisma.program.findUniqueOrThrow({ where: { id: programId } });
    return prisma.program.update({
        where: { id: programId },
        data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.ageMin !== undefined ? { ageMin: input.ageMin } : {}),
            ...(input.ageMax !== undefined ? { ageMax: input.ageMax } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
    });
}
export async function getProgramDetails(programId) {
    const program = await prisma.program.findUnique({
        where: { id: programId },
        include: {
            centerPrograms: {
                where: { isActive: true },
                include: { center: { select: { id: true, name: true, location: true } } },
            },
        },
    });
    if (!program)
        throw new NotFoundError("Program");
    const students = await prisma.student.findMany({
        where: { programId, isActive: true },
        select: { id: true, fullName: true, rollNumber: true, centerId: true },
        orderBy: { fullName: 'asc' },
        take: 200,
    });
    const studentCount = await prisma.student.count({
        where: { programId, isActive: true },
    });
    return { ...program, students, studentCount };
}
export async function getProgramCenters(programId) {
    await prisma.program.findUniqueOrThrow({ where: { id: programId } });
    return prisma.centerProgram.findMany({
        where: { programId, isActive: true },
        include: {
            center: true,
            program: true,
        },
        orderBy: { center: { name: "asc" } },
    });
}

import prisma from "../lib/prisma.js";
import { UserRole } from "@prisma/client";
export async function getSkillsByStudent(user, studentId) {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
    });
    if (!student)
        throw new Error("Student not found");
    // RBAC: Center check
    if (user.role !== UserRole.super_admin && !user.centerIds.includes(student.centerId)) {
        throw new Error("Unauthorized");
    }
    const logs = await prisma.studentSkillLog.findMany({
        where: { studentId },
        include: {
            skill: true,
            assessedByUser: true,
        },
        orderBy: { assessedOn: "desc" },
    });
    return logs;
}
export async function createSkillLog(user, studentId, data) {
    return prisma.studentSkillLog.create({
        data: {
            studentId,
            centerId: data.centerId,
            skillId: data.skillId,
            level: data.level,
            remarks: data.remarks,
            assessedBy: user.userId,
        },
    });
}
export async function listSkillDefinitions(programId) {
    const where = {};
    if (programId)
        where.programId = programId;
    return prisma.skillDefinition.findMany({
        where,
        include: {
            program: true,
        },
    });
}

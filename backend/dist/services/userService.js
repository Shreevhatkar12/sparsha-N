import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from '../lib/prisma.js';
import { AppError, NotFoundError, ValidationError } from '../lib/errors.js';
const SALT_ROUNDS = 10;
function toSafeUser(user) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
}
export async function listUsers(query) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.max(query.limit ?? 50, 1);
    const skip = (page - 1) * limit;
    const where = {
        ...(query.createdBy ? { createdBy: query.createdBy } : {}),
        ...(query.role ? { role: query.role } : {}),
        ...(query.centerId
            ? {
                centerAssignments: {
                    some: {
                        centerId: query.centerId,
                    },
                },
            }
            : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
            ? {
                OR: [
                    { fullName: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                centerAssignments: {
                    include: {
                        center: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        }),
        prisma.user.count({ where }),
    ]);
    return {
        users: users.map((user) => toSafeUser(user)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}
export async function getUserById(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            centerAssignments: {
                include: {
                    center: {
                        select: { id: true, name: true, location: true, isActive: true },
                    },
                },
            },
        },
    });
    if (!user) {
        throw new NotFoundError("User");
    }
    return toSafeUser(user);
}
export async function createUser(input) {
    try {
        const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
        const user = await prisma.user.create({
            data: {
                email: input.email,
                passwordHash: hashedPassword,
                fullName: input.fullName,
                phone: input.phone ?? null,
                role: input.role,
                createdBy: input.createdBy ?? null,
                centerAssignments: input.centerIds?.length && input.createdBy
                    ? {
                        create: input.centerIds.map((id) => ({
                            center: { connect: { id } },
                            createdByUser: { connect: { id: input.createdBy } },
                            validFrom: new Date(),
                        })),
                    }
                    : undefined,
            },
            include: {
                centerAssignments: {
                    include: {
                        center: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });
        return toSafeUser(user);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError("Email already exists", 409);
        }
        throw error;
    }
}
export async function updateUser(userId, input) {
    await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(input.role !== undefined ? { role: input.role } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        include: {
            centerAssignments: {
                include: {
                    center: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
    });
    return toSafeUser(updated);
}
export async function resetUserPassword(userId, newPassword) {
    if (newPassword.length < 8) {
        throw new ValidationError("newPassword must be at least 8 characters");
    }
    await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
    });
    return { success: true };
}
export async function softDeleteUser(targetUserId, currentUser) {
    if (targetUserId === currentUser.userId) {
        throw new AppError("You cannot deactivate your own account", 400);
    }
    await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } });
    const user = await prisma.user.update({
        where: { id: targetUserId },
        data: { isActive: false },
    });
    return toSafeUser(user);
}
export async function getMyCenters(currentUser) {
    const user = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: {
            id: true,
            fullName: true,
            role: true,
            centerAssignments: {
                include: {
                    center: {
                        select: { id: true, name: true, location: true, isActive: true },
                    },
                },
                orderBy: { validFrom: "desc" },
            },
        },
    });
    if (!user) {
        throw new NotFoundError("User");
    }
    return {
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
        centerAssignments: user.centerAssignments,
    };
}
export async function updateUserCenters(adminId, targetUserId, assignments) {
    await prisma.user.findUniqueOrThrow({
        where: { id: targetUserId },
    });
    await prisma.userCenterAssignment.deleteMany({
        where: {
            userId: targetUserId,
        },
    });
    if (assignments.length > 0) {
        await prisma.userCenterAssignment.createMany({
            data: assignments.map((assignment) => ({
                userId: targetUserId,
                centerId: assignment.centerId,
                programId: assignment.programId ?? null,
                createdBy: adminId,
                validFrom: new Date(),
            })),
        });
    }
    return getUserById(targetUserId);
}

import { Prisma } from "@prisma/client";
import type { JwtPayload } from "../lib/auth.ts";
import prisma from "../lib/prisma.ts";
import { AppError, NotFoundError } from "../lib/errors.ts";

function activeAssignmentWhere(userId?: string) {
  return {
    ...(userId ? { userId } : {}),
    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
  };
}

export async function listCenters(user: JwtPayload) {
  const where =
    user.role === "admin"
      ? {}
      : {
          users: {
            some: activeAssignmentWhere(user.userId),
          },
        };

  return prisma.center.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      centerPrograms: {
        where: { isActive: true },
        include: { program: true },
      },
    },
  });
}

export async function getCenterDetails(user: JwtPayload, centerId: string) {
  if (user.role !== "admin" && !user.centerIds.includes(centerId)) {
    throw new NotFoundError("Center");
  }

  const center = await prisma.center.findUnique({
    where: { id: centerId },
    include: {
      centerPrograms: {
        where: { isActive: true },
        include: { program: true },
      },
    },
  });
  if (!center) throw new NotFoundError("Center");

  const [userCount, studentCount] = await Promise.all([
    prisma.userCenterAssignment.count({
      where: {
        centerId,
        ...activeAssignmentWhere(),
        user: { role: { in: ["teacher", "staff"] } },
      },
    }),
    prisma.student.count({
      where: {
        centerId,
        isActive: true,
      },
    }),
  ]);

  return {
    ...center,
    userCount,
    studentCount,
  };
}

export async function createCenter(input: { name: string; location?: string }) {
  return prisma.center.create({
    data: {
      name: input.name,
      location: input.location ?? null,
    },
  });
}

export async function updateCenter(
  centerId: string,
  input: { name?: string; location?: string; isActive?: boolean },
) {
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

export async function assignProgramToCenter(centerId: string, programId: string) {
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

export async function removeProgramFromCenter(centerId: string, programId: string) {
  const centerProgram = await prisma.centerProgram.findFirst({
    where: { centerId, programId },
  });
  if (!centerProgram) throw new NotFoundError("Center program mapping");

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

export async function assignUserToCenter(
  centerId: string,
  input: { userId: string; validFrom?: string; validUntil?: string },
) {
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

export async function removeUserFromCenter(centerId: string, userId: string) {
  const assignment = await prisma.userCenterAssignment.findFirst({
    where: { centerId, userId },
  });
  if (!assignment) throw new NotFoundError("User center assignment");

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

export async function createProgram(input: {
  code: string;
  name: string;
  ageMin?: number;
  ageMax?: number;
  description?: string;
}) {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Program code must be unique", 409);
    }
    throw error;
  }
}

export async function updateProgram(
  programId: string,
  input: { name?: string; ageMin?: number; ageMax?: number; description?: string; isActive?: boolean },
) {
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

export async function getProgramCenters(programId: string) {
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

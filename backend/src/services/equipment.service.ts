import prisma from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export async function listEquipment(centerIds: string[], role?: string) {
  const where: any = {};
  if (role !== "super_admin") {
    where.centerId = { in: centerIds };
  }

  return prisma.equipment.findMany({
    where,
    include: { center: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createEquipment(data: any, userId: string) {
  return prisma.equipment.create({
    data: {
      ...data,
      createdBy: userId,
    },
  });
}

export async function logEquipmentAction(equipmentId: string, centerId: string, userId: string, action: string, notes?: string) {
  return prisma.equipmentLog.create({
    data: {
      equipmentId,
      centerId,
      loggedBy: userId,
      action,
      notes,
    },
  });
}

export async function getEquipmentLogs(equipmentId: string) {
  return prisma.equipmentLog.findMany({
    where: { equipmentId },
    include: { loggedByUser: { select: { fullName: true } } },
    orderBy: { loggedAt: "desc" },
  });
}

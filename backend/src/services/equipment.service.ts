import prisma from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export async function listEquipment(centerIds: string[], role?: string, query: { centerId?: string; search?: string; category?: string } = {}) {
  const where: any = {};
  
  const { centerId, search, category } = query;

  if (role === "super_admin" || role === "tech_admin") {
    if (centerId) {
      where.centerId = centerId;
    }
  } else {
    if (centerId && centerIds.includes(centerId)) {
      where.centerId = centerId;
    } else {
      where.centerId = { in: centerIds };
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category && category !== "All Categories") {
    where.category = category;
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

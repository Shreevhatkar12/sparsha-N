import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import * as equipmentService from "../services/equipment.service.js";

export async function listEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { centerIds, role } = req.user!;
    const centerId = req.query.centerId as string;
    const equipment = await equipmentService.listEquipment(centerIds, role, centerId);
    res.json(equipment);
  } catch (err) {
    next(err);
  }
}

export async function createEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user!;
    const equipment = await equipmentService.createEquipment(req.body, userId);
    res.status(201).json(equipment);
  } catch (err) {
    next(err);
  }
}

export async function logAction(req: Request, res: Response, next: NextFunction) {
  try {
    const { equipmentId } = req.params;
    const { action, remarks } = req.body;
    const { userId } = req.user!;
    
    // We need the centerId for the log entry
    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new Error("Equipment not found");

    const log = await equipmentService.logEquipmentAction(equipmentId, equipment.centerId, userId, action, remarks);
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
}

export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { equipmentId } = req.params;
    const logs = await equipmentService.getEquipmentLogs(equipmentId);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

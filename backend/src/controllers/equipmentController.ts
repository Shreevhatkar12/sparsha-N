import { Request, Response, NextFunction } from "express";
import * as equipmentService from "../services/equipment.service.js";

export async function listEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { centerIds } = req.user!;
    const equipment = await equipmentService.listEquipment(centerIds);
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
    const log = await equipmentService.logEquipmentAction(equipmentId, userId, action, remarks);
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

import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import * as equipmentController from "../controllers/equipmentController.js";

const router = Router();

router.use(authenticate);

router.get("/", equipmentController.listEquipment);
router.post("/", equipmentController.createEquipment);
router.get("/:equipmentId/logs", equipmentController.getLogs);
router.post("/:equipmentId/logs", equipmentController.logAction);

export default router;

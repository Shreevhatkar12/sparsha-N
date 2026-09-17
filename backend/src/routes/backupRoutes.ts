import { Router } from "express";
import { requireAuth as authenticate } from "../lib/auth.js";
import { getBackupStatusController, triggerBackupSyncController } from "../controllers/backupController.js";

const backupRoutes = Router();

backupRoutes.use(authenticate);
backupRoutes.get("/status", getBackupStatusController);
backupRoutes.post("/sync-now", triggerBackupSyncController);

export default backupRoutes;

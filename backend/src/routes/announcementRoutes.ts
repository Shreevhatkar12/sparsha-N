import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import * as announcementController from "../controllers/announcementController.js";

const router = Router();

router.use(authenticate);

router.get("/", announcementController.listAnnouncements);
router.post("/", announcementController.createAnnouncement);

export default router;

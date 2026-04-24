import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import * as messageController from "../controllers/messageController.js";

const router = Router();

router.use(authenticate);

router.get("/threads", messageController.listThreads);
router.post("/threads", messageController.createThread);
router.get("/threads/:threadId/messages", messageController.getThreadMessages);
router.post("/threads/:threadId/messages", messageController.sendMessage);

export default router;

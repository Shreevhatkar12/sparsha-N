import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { syncTemplatesController, syncSubmissionsController } from "../controllers/kobo.controller.js";

const router = Router();

router.use(authenticate);

// Only admins should trigger manual mass syncs
router.post("/sync/templates", authorize("super_admin", "tech_admin", "center_admin"), syncTemplatesController);
router.post("/sync/submissions", authorize("super_admin", "tech_admin", "center_admin", "teacher", "staff"), syncSubmissionsController);

export default router;

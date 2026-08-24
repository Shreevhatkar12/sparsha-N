import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  listCampsController,
  createCampController,
  updateCampController,
  deleteCampController,
  campRosterController,
  sehatDashboardController,
} from '../controllers/sehatController.js';

const router = Router();

router.use(requireAuth);

// Sehat (health) module — health camps for students & parents.
router.get('/dashboard', sehatDashboardController);
router.get('/camps', listCampsController);
router.post('/camps', createCampController);
router.get('/camps/:id', campRosterController);
router.put('/camps/:id', updateCampController);
router.delete('/camps/:id', deleteCampController);

export default router;

import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  listSwayamStudentsController,
  createSwayamStudentController,
  updateSwayamStudentController,
  deleteSwayamStudentController,
  listDropoutController,
  createDropoutController,
  updateDropoutController,
  reenrollDropoutController,
  updateReenrolledController,
} from '../controllers/swayamController.js';

const router = Router();

router.use(requireAuth);

router.get('/students', listSwayamStudentsController);
router.post('/students', createSwayamStudentController);
router.put('/students/:id', updateSwayamStudentController);
router.delete('/students/:id', deleteSwayamStudentController);

// Dropout tracking (delete reuses the soft-delete above via /students/:id)
router.get('/dropouts', listDropoutController);
router.post('/dropouts', createDropoutController);
router.put('/dropouts/:id', updateDropoutController);
router.post('/dropouts/:id/reenroll', reenrollDropoutController);
router.put('/dropouts/:id/reenroll', updateReenrolledController);

export default router;

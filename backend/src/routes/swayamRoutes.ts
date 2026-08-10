import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  listSwayamStudentsController,
  createSwayamStudentController,
  updateSwayamStudentController,
  deleteSwayamStudentController,
} from '../controllers/swayamController.js';

const router = Router();

router.use(requireAuth);

router.get('/students', listSwayamStudentsController);
router.post('/students', createSwayamStudentController);
router.put('/students/:id', updateSwayamStudentController);
router.delete('/students/:id', deleteSwayamStudentController);

export default router;

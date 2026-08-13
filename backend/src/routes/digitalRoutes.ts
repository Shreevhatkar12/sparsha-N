import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  listDigitalController,
  createDigitalController,
  updateDigitalController,
  deleteDigitalController,
  digitalMetaController,
  digitalPickController,
  listDigitalExamsController,
  createDigitalExamController,
  updateDigitalExamController,
  deleteDigitalExamController,
} from '../controllers/digitalController.js';

const router = Router();

router.use(requireAuth);

router.get('/students', listDigitalController);
router.post('/students', createDigitalController);
router.put('/students/:id', updateDigitalController);
router.delete('/students/:id', deleteDigitalController);

// Cascading picker for in-center students (program → center → std → student)
router.get('/meta', digitalMetaController);
router.get('/pick', digitalPickController);

// Digital Literacy exams (marks map lives inside the exam record)
router.get('/exams', listDigitalExamsController);
router.post('/exams', createDigitalExamController);
router.put('/exams/:id', updateDigitalExamController);
router.delete('/exams/:id', deleteDigitalExamController);

export default router;

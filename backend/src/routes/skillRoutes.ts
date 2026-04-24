import { Router } from "express";
import { requireAuth as authenticate } from '../lib/auth.js';
import {
  getSkillsByStudentController,
  listSkillDefinitionsController,
} from '../controllers/skillController.js';

const skillRoutes = Router();

skillRoutes.use(authenticate);

skillRoutes.get("/definitions", listSkillDefinitionsController);
skillRoutes.get("/student/:studentId", getSkillsByStudentController);

export default skillRoutes;

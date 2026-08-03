import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import {
  testMeetingController,
  getMeetingStatsController,
  createStudentMeetingController,
  updateStudentMeetingController,
  deleteStudentMeetingController,
  listStudentMeetingsController,
  getStudentMeetingController,
  createParentMeetingController,
  updateParentMeetingController,
  deleteParentMeetingController,
  listParentMeetingsController,
  getParentMeetingController,
} from '../controllers/meetingController.js';

const router = Router();

router.get('/test', testMeetingController);
router.get('/stats', getMeetingStatsController);

// Student Meetings
router.post('/student', requireAuth, createStudentMeetingController);
router.get('/student', requireAuth, listStudentMeetingsController);
router.get('/student/:id', requireAuth, getStudentMeetingController);
router.put('/student/:id', requireAuth, updateStudentMeetingController);
router.delete('/student/:id', requireAuth, deleteStudentMeetingController);

// Parent Meetings
router.post('/parent', requireAuth, createParentMeetingController);
router.get('/parent', requireAuth, listParentMeetingsController);
router.get('/parent/:id', requireAuth, getParentMeetingController);
router.put('/parent/:id', requireAuth, updateParentMeetingController);
router.delete('/parent/:id', requireAuth, deleteParentMeetingController);

export default router;
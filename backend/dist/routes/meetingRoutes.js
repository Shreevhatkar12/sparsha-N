import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { testMeetingController, getMeetingStatsController, createStudentMeetingController, listStudentMeetingsController, getStudentMeetingController, createParentMeetingController, listParentMeetingsController, getParentMeetingController, } from '../controllers/meetingController.js';
const router = Router();
router.get('/test', testMeetingController);
router.get('/stats', getMeetingStatsController);
// Student Meetings
router.post('/student', requireAuth, createStudentMeetingController);
router.get('/student', requireAuth, listStudentMeetingsController);
router.get('/student/:id', requireAuth, getStudentMeetingController);
// Parent Meetings
router.post('/parent', requireAuth, createParentMeetingController);
router.get('/parent', requireAuth, listParentMeetingsController);
router.get('/parent/:id', requireAuth, getParentMeetingController);
export default router;

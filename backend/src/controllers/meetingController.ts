import {
  testMeetingService,
  getMeetingStats,
  createStudentMeeting,
  updateStudentMeeting,
  deleteStudentMeeting,
  listStudentMeetings,
  getStudentMeetingById,
  createParentMeeting,
  updateParentMeeting,
  deleteParentMeeting,
  listParentMeetings,
  getParentMeetingById,
} from '../services/meetingService.js';

export async function testMeetingController(req: any, res: any) {
  return res.status(200).json({
    success: true,
    message: 'Meeting Controller Working',
  });
}

export async function getMeetingStatsController(req: any, res: any) {
  try {
    const data = await getMeetingStats();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function createStudentMeetingController(req: any, res: any) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const meeting = await createStudentMeeting(userId, req.body);
    return res.status(201).json({ success: true, data: meeting, id: meeting.id });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateStudentMeetingController(req: any, res: any) {
  try {
    const meeting = await updateStudentMeeting(req.params.id, req.body);
    return res.status(200).json({ success: true, data: meeting, id: meeting.id });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteStudentMeetingController(req: any, res: any) {
  try {
    await deleteStudentMeeting(req.params.id);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function listStudentMeetingsController(req: any, res: any) {
  try {
    const meetings = await listStudentMeetings(req.user, req.query);
    return res.status(200).json({ success: true, data: meetings });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getStudentMeetingController(req: any, res: any) {
  try {
    const meeting = await getStudentMeetingById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: 'Meeting not found' });
    return res.status(200).json({ success: true, data: meeting });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function createParentMeetingController(req: any, res: any) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const meeting = await createParentMeeting(userId, req.body);
    return res.status(201).json({ success: true, data: meeting, id: meeting.id });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateParentMeetingController(req: any, res: any) {
  try {
    const meeting = await updateParentMeeting(req.params.id, req.body);
    return res.status(200).json({ success: true, data: meeting, id: meeting.id });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteParentMeetingController(req: any, res: any) {
  try {
    await deleteParentMeeting(req.params.id);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function listParentMeetingsController(req: any, res: any) {
  try {
    const meetings = await listParentMeetings(req.user, req.query);
    return res.status(200).json({ success: true, data: meetings });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getParentMeetingController(req: any, res: any) {
  try {
    const meeting = await getParentMeetingById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: 'Meeting not found' });
    return res.status(200).json({ success: true, data: meeting });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
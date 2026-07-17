import { getMeetingStats, createStudentMeeting, listStudentMeetings, getStudentMeetingById, createParentMeeting, listParentMeetings, getParentMeetingById, } from '../services/meetingService.js';
export async function testMeetingController(req, res) {
    return res.status(200).json({
        success: true,
        message: 'Meeting Controller Working',
    });
}
export async function getMeetingStatsController(req, res) {
    try {
        const data = await getMeetingStats();
        return res.status(200).json({ success: true, data });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
export async function createStudentMeetingController(req, res) {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const meeting = await createStudentMeeting(userId, req.body);
        return res.status(201).json({ success: true, data: meeting, id: meeting.id });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
export async function listStudentMeetingsController(req, res) {
    try {
        const meetings = await listStudentMeetings(req.user, req.query);
        return res.status(200).json({ success: true, data: meetings });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
export async function getStudentMeetingController(req, res) {
    try {
        const meeting = await getStudentMeetingById(req.params.id);
        if (!meeting)
            return res.status(404).json({ success: false, error: 'Meeting not found' });
        return res.status(200).json({ success: true, data: meeting });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
export async function createParentMeetingController(req, res) {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const meeting = await createParentMeeting(userId, req.body);
        return res.status(201).json({ success: true, data: meeting, id: meeting.id });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
export async function listParentMeetingsController(req, res) {
    try {
        const meetings = await listParentMeetings(req.user, req.query);
        return res.status(200).json({ success: true, data: meetings });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
export async function getParentMeetingController(req, res) {
    try {
        const meeting = await getParentMeetingById(req.params.id);
        if (!meeting)
            return res.status(404).json({ success: false, error: 'Meeting not found' });
        return res.status(200).json({ success: true, data: meeting });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

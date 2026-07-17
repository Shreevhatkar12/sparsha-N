import { listActivities, getActivity, createActivity, updateActivity, deleteActivity, assignVolunteer, removeVolunteerAssignment, } from '../services/activityService.js';
export async function listActivitiesController(req, res, next) {
    try {
        const user = req.user;
        const activities = await listActivities(user, {
            centerId: req.query.centerId,
            programId: req.query.programId,
            from: req.query.from,
            to: req.query.to,
            search: req.query.search,
        });
        return res.status(200).json(activities);
    }
    catch (error) {
        return next(error);
    }
}
export async function getActivityController(req, res, next) {
    try {
        const user = req.user;
        const activity = await getActivity(user, req.params.activityId);
        return res.status(200).json(activity);
    }
    catch (error) {
        return next(error);
    }
}
export async function createActivityController(req, res, next) {
    try {
        const user = req.user;
        const activity = await createActivity(user, req.body);
        return res.status(201).json(activity);
    }
    catch (error) {
        return next(error);
    }
}
export async function updateActivityController(req, res, next) {
    try {
        const user = req.user;
        const activity = await updateActivity(user, req.params.activityId, req.body);
        return res.status(200).json(activity);
    }
    catch (error) {
        return next(error);
    }
}
export async function deleteActivityController(req, res, next) {
    try {
        const user = req.user;
        await deleteActivity(user, req.params.activityId);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
}
export async function assignVolunteerController(req, res, next) {
    try {
        const user = req.user;
        const assignment = await assignVolunteer(req.params.activityId, req.body, user.userId);
        return res.status(200).json(assignment);
    }
    catch (error) {
        return next(error);
    }
}
export async function removeVolunteerAssignmentController(req, res, next) {
    try {
        await removeVolunteerAssignment(req.params.activityId, req.params.userId);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
}

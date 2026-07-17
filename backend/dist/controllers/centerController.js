import { assignProgramToCenter, assignUserToCenter, createCenter, createProgram, deleteCenter, getCenterDetails, getProgramCenters, getProgramDetails, listCenters, listPrograms, removeProgramFromCenter, removeUserFromCenter, updateCenter, updateProgram, } from '../services/centerService.js';
export async function listCentersController(req, res, next) {
    try {
        const centers = await listCenters(req.user);
        return res.status(200).json({ centers });
    }
    catch (error) {
        return next(error);
    }
}
export async function getCenterController(req, res, next) {
    try {
        const center = await getCenterDetails(req.user, req.params.centerId);
        return res.status(200).json(center);
    }
    catch (error) {
        return next(error);
    }
}
export async function createCenterController(req, res, next) {
    try {
        const center = await createCenter(req.body);
        return res.status(201).json(center);
    }
    catch (error) {
        return next(error);
    }
}
export async function deleteCenterController(req, res, next) {
    try {
        await deleteCenter(req.params.centerId);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
}
export async function updateCenterController(req, res, next) {
    try {
        const center = await updateCenter(req.params.centerId, req.body);
        return res.status(200).json(center);
    }
    catch (error) {
        return next(error);
    }
}
export async function assignProgramController(req, res, next) {
    try {
        const result = await assignProgramToCenter(req.params.centerId, req.body.programId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function removeProgramController(req, res, next) {
    try {
        const result = await removeProgramFromCenter(req.params.centerId, req.params.programId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function assignUserController(req, res, next) {
    try {
        const user = req.user;
        const result = await assignUserToCenter(user.userId, req.params.centerId, req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function removeUserController(req, res, next) {
    try {
        const result = await removeUserFromCenter(req.params.centerId, req.params.userId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function listProgramsController(_req, res, next) {
    try {
        const programs = await listPrograms();
        return res.status(200).json(programs);
    }
    catch (error) {
        return next(error);
    }
}
export async function createProgramController(req, res, next) {
    try {
        const program = await createProgram(req.body);
        return res.status(201).json(program);
    }
    catch (error) {
        return next(error);
    }
}
export async function updateProgramController(req, res, next) {
    try {
        const program = await updateProgram(req.params.programId, req.body);
        return res.status(200).json(program);
    }
    catch (error) {
        return next(error);
    }
}
export async function programCentersController(req, res, next) {
    try {
        const rows = await getProgramCenters(req.params.programId);
        return res.status(200).json(rows);
    }
    catch (error) {
        return next(error);
    }
}
export async function getProgramDetailsController(req, res, next) {
    try {
        const details = await getProgramDetails(req.params.programId);
        return res.status(200).json(details);
    }
    catch (error) {
        return next(error);
    }
}

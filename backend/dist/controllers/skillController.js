import { getSkillsByStudent, listSkillDefinitions, createSkillLog } from '../services/skillService.js';
export async function createSkillLogController(req, res, next) {
    try {
        const result = await createSkillLog(req.user, req.params.studentId, req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getSkillsByStudentController(req, res, next) {
    try {
        const result = await getSkillsByStudent(req.user, req.params.studentId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function listSkillDefinitionsController(req, res, next) {
    try {
        const result = await listSkillDefinitions(req.query.programId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}

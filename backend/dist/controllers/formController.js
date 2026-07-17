import { createTemplate, deleteSubmission, getPendingSubmissions, getStudentSubmissions, getSubmissionById, getTemplateById, listSubmissions, listTemplates, softDeleteTemplate, submitForm, updateTemplate } from '../services/formService.js';
export async function createTemplateController(req, res, next) {
    try {
        const result = await createTemplate(req.user, req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function listTemplatesController(req, res, next) {
    try {
        const user = req.user;
        const includeInactive = user.role === "super_admin" &&
            (req.query.includeInactive === "true" || req.query.includeInactive === "1");
        const result = await listTemplates(req.query.formType, {
            includeInactive,
        });
        return res.status(200).json({ templates: result });
    }
    catch (error) {
        return next(error);
    }
}
export async function getTemplateController(req, res, next) {
    try {
        const result = await getTemplateById(req.params.templateId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function updateTemplateController(req, res, next) {
    try {
        const result = await updateTemplate(req.params.templateId, req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function deleteTemplateController(req, res, next) {
    try {
        const result = await softDeleteTemplate(req.params.templateId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function submitFormController(req, res, next) {
    try {
        const result = await submitForm(req.user, req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function listSubmissionsController(req, res, next) {
    try {
        const result = await listSubmissions(req.user, {
            templateId: req.query.templateId,
            studentId: req.query.studentId,
            centerId: req.query.centerId,
            from: req.query.from,
            to: req.query.to,
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 50,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getSubmissionController(req, res, next) {
    try {
        const result = await getSubmissionById(req.user, req.params.submissionId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function deleteSubmissionController(req, res, next) {
    try {
        const result = await deleteSubmission(req.params.submissionId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getStudentSubmissionsController(req, res, next) {
    try {
        const result = await getStudentSubmissions(req.user, req.params.studentId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getPendingFormsController(req, res, next) {
    try {
        const result = await getPendingSubmissions(req.user, {
            templateId: req.query.templateId,
            centerId: req.query.centerId,
        });
        return res.status(200).json({ students: result });
    }
    catch (error) {
        return next(error);
    }
}

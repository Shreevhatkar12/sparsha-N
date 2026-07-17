import { createExam, getExamById, getExamComparison, getPendingExamScores, getStudentExamScores, getExamSheet, listExams, upsertExamScores, } from '../services/examService.js';
export async function createExamController(req, res, next) {
    try {
        const result = await createExam(req.user, req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getExamSheetController(req, res, next) {
    try {
        const { examId } = req.params;
        const result = await getExamSheet(req.user, examId);
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
}
export async function listExamsController(req, res, next) {
    try {
        const result = await listExams(req.user, {
            centerId: req.query.centerId,
            programId: req.query.programId,
            examType: req.query.examType,
            academicYearId: req.query.academicYearId,
            examDate: req.query.examDate, // ✅ FIX
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getExamByIdController(req, res, next) {
    try {
        const result = await getExamById(req.user, req.params.examId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function upsertExamScoresController(req, res, next) {
    try {
        const result = await upsertExamScores(req.user, req.params.examId, req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getPendingExamScoresController(req, res, next) {
    try {
        const result = await getPendingExamScores(req.user, req.params.examId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getExamComparisonController(req, res, next) {
    try {
        const result = await getExamComparison(req.user, {
            centerId: req.query.centerId,
            programId: req.query.programId,
            academicYearId: req.query.academicYearId,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getStudentExamScoresController(req, res, next) {
    try {
        const result = await getStudentExamScores(req.user, req.params.studentId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}

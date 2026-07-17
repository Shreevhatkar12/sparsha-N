import { getDashboardSummary, getAttendanceAnalytics, getExamAnalytics, getFilteredStudents, exportStudentDataCsv, getSkillsReport, } from '../services/reportService.js';
export async function dashboardController(req, res, next) {
    try {
        const user = req.user;
        const data = await getDashboardSummary(user);
        return res.status(200).json(data);
    }
    catch (err) {
        return next(err);
    }
}
export async function attendanceController(req, res, next) {
    try {
        const user = req.user;
        const data = await getAttendanceAnalytics(user, req.query);
        return res.status(200).json(data);
    }
    catch (err) {
        return next(err);
    }
}
export async function examsController(req, res, next) {
    try {
        const user = req.user;
        const data = await getExamAnalytics(user, req.query);
        return res.status(200).json(data);
    }
    catch (err) {
        return next(err);
    }
}
export async function skillsReportController(req, res, next) {
    try {
        const user = req.user;
        const data = await getSkillsReport(user, {
            centerId: req.query.centerId,
            programId: req.query.programId,
        });
        return res.status(200).json(data);
    }
    catch (err) {
        return next(err);
    }
}
export async function studentsFilterController(req, res, next) {
    try {
        const user = req.user;
        const data = await getFilteredStudents(user, req.query);
        return res.status(200).json(data);
    }
    catch (err) {
        return next(err);
    }
}
export async function exportCsvController(req, res, next) {
    try {
        const user = req.user;
        const csvString = await exportStudentDataCsv(user, req.query);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=student_export.csv");
        return res.status(200).send(csvString);
    }
    catch (err) {
        return next(err);
    }
}

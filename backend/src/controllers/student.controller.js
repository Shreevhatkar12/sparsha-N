import * as studentService from "../services/student.service.js";

/* ─────────────────────────────────────────
   STUDENTS
───────────────────────────────────────── */

export const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.user, req.body);
    return res.status(201).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

export const getAllStudents = async (req, res, next) => {
  try {
    const { page, limit, search, centerId, programId, isActive } = req.query;
    const result = await studentService.getAllStudents(req.user, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
      search,
      centerId,
      programId,
      isActive:
        typeof isActive === "string" ? isActive.toLowerCase() === "true" : undefined,
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.user, req.params.id);
    return res.status(200).json(student);
  } catch (err) {
    next(err);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const student = await studentService.updateStudent(req.user, req.params.id, req.body);
    return res.status(200).json(student);
  } catch (err) {
    next(err);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const result = await studentService.deleteStudent(req.user, req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const filterStudents = async (req, res, next) => {
  try {
    const result = await studentService.filterStudents(req.user, req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getStudentSummary = async (req, res, next) => {
  try {
    const summary = await studentService.getStudentSummary(req.user, req.params.id);
    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};

export const getStudentProfile = async (req, res, next) => {
  try {
    const profile = await studentService.getStudentProfile(req.user, req.params.id);
    return res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────
   ATTENDANCE
───────────────────────────────────────── */

export const addAttendance = async (req, res, next) => {
  try {
    const record = await studentService.addAttendance(
      req.user,
      req.params.studentId,
      req.body
    );
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceByStudent = async (req, res, next) => {
  try {
    const records = await studentService.getAttendanceByStudent(
      req.user,
      req.params.studentId,
    );
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const record = await studentService.updateAttendance(
      parseInt(req.params.id),
      req.body
    );
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────
   SKILLS
───────────────────────────────────────── */

export const addSkill = async (req, res, next) => {
  try {
    const record = await studentService.addSkill(
      req.user,
      req.params.studentId,
      req.body
    );
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

export const getSkillsByStudent = async (req, res, next) => {
  try {
    const records = await studentService.getSkillsByStudent(
      req.user,
      req.params.studentId,
    );
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

export const updateSkill = async (req, res, next) => {
  try {
    const record = await studentService.updateSkill(
      parseInt(req.params.id),
      req.body
    );
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────
   CAREERS
───────────────────────────────────────── */

export const addCareer = async (req, res, next) => {
  try {
    const record = await studentService.addCareer(
      req.user,
      req.params.studentId,
      req.body
    );
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

export const getCareersByStudent = async (req, res, next) => {
  try {
    const records = await studentService.getCareersByStudent(
      req.user,
      req.params.studentId,
    );
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

export const updateCareer = async (req, res, next) => {
  try {
    const record = await studentService.updateCareer(
      parseInt(req.params.id),
      req.body
    );
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────── */

export const getDashboardStats = async (_req, res, next) => {
  try {
    const stats = await studentService.getDashboardStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};
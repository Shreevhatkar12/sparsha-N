import * as studentService from "../services/student.service.js";

/* ─────────────────────────────────────────
   STUDENTS
───────────────────────────────────────── */

export const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.body);
    return res.status(201).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

export const getAllStudents = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await studentService.getAllStudents({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(parseInt(req.params.id));
    return res.status(200).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const student = await studentService.updateStudent(
      parseInt(req.params.id),
      req.body
    );
    return res.status(200).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const result = await studentService.deleteStudent(parseInt(req.params.id));
    return res.status(200).json({ success: true, ...result });
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
      parseInt(req.params.studentId),
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
      parseInt(req.params.studentId)
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
      parseInt(req.params.studentId),
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
      parseInt(req.params.studentId)
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
      parseInt(req.params.studentId),
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
      parseInt(req.params.studentId)
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
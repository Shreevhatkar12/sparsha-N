import prisma from "../lib/prisma.js";

/* ─────────────────────────────────────────
   STUDENTS
───────────────────────────────────────── */

export const createStudent = async (data) => {
  return prisma.student.create({ data });
};

export const getAllStudents = async ({ page = 1, limit = 20, search } = {}) => {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { schoolName: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      }
    : {};

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { attendance: true, skills: true, careers: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { attendance: true, skills: true, careers: true },
  });

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  return student;
};

export const updateStudent = async (id, data) => {
  await getStudentById(id); // ensure exists
  return prisma.student.update({ where: { id }, data });
};

export const deleteStudent = async (id) => {
  await getStudentById(id); // ensure exists
  await prisma.student.delete({ where: { id } });
  return { message: "Student deleted successfully" };
};

/* ─────────────────────────────────────────
   ATTENDANCE
───────────────────────────────────────── */

export const addAttendance = async (studentId, data) => {
  await getStudentById(studentId); // ensure student exists
  return prisma.attendance.create({ data: { ...data, studentId } });
};

export const getAttendanceByStudent = async (studentId) => {
  await getStudentById(studentId);
  return prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
  });
};

export const updateAttendance = async (id, data) => {
  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) {
    const error = new Error("Attendance record not found");
    error.statusCode = 404;
    throw error;
  }
  return prisma.attendance.update({ where: { id }, data });
};

/* ─────────────────────────────────────────
   SKILLS
───────────────────────────────────────── */

export const addSkill = async (studentId, data) => {
  await getStudentById(studentId);
  return prisma.skill.create({ data: { ...data, studentId } });
};

export const getSkillsByStudent = async (studentId) => {
  await getStudentById(studentId);
  return prisma.skill.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
};

export const updateSkill = async (id, data) => {
  const record = await prisma.skill.findUnique({ where: { id } });
  if (!record) {
    const error = new Error("Skill record not found");
    error.statusCode = 404;
    throw error;
  }
  return prisma.skill.update({ where: { id }, data });
};

/* ─────────────────────────────────────────
   CAREERS
───────────────────────────────────────── */

export const addCareer = async (studentId, data) => {
  await getStudentById(studentId);
  return prisma.career.create({ data: { ...data, studentId } });
};

export const getCareersByStudent = async (studentId) => {
  await getStudentById(studentId);
  return prisma.career.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
};

export const updateCareer = async (id, data) => {
  const record = await prisma.career.findUnique({ where: { id } });
  if (!record) {
    const error = new Error("Career record not found");
    error.statusCode = 404;
    throw error;
  }
  return prisma.career.update({ where: { id }, data });
};

/* ─────────────────────────────────────────
   DASHBOARD SUMMARY
───────────────────────────────────────── */

export const getDashboardStats = async () => {
  const [totalStudents, totalAttendance, presentCount, skillAggregates] =
    await Promise.all([
      prisma.student.count(),
      prisma.attendance.count(),
      prisma.attendance.count({ where: { status: "present" } }),
      prisma.skill.aggregate({
        _avg: {
          communication: true,
          confidence: true,
          computerSkill: true,
          problemSolving: true,
          languageSkill: true,
        },
      }),
    ]);

  const attendanceRate =
    totalAttendance > 0
      ? ((presentCount / totalAttendance) * 100).toFixed(1)
      : 0;

  return {
    totalStudents,
    totalSessions: totalAttendance,
    attendanceRate: `${attendanceRate}%`,
    avgSkills: skillAggregates._avg,
  };
};
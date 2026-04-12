import fs from 'fs';

const filePath = 'backend/src/services/student.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add import
if (!content.includes('AuthUser')) {
  content = content.replace(
    'import { centerScope } from "../lib/centerScope.js";',
    'import type { AuthUser } from "../types/index.js";\nimport { centerScope } from "../lib/centerScope.js";'
  );
}

// ScopedWhere
content = content.replace(
  'const scopedWhere = (user, otherConditions = {}) => ({',
  'const scopedWhere = (user: AuthUser | undefined, otherConditions: Record<string, unknown> = {}) => ({'
);

// Replace functions
content = content.replace(
  'export const createStudent = async (user, data) => {',
  'export const createStudent = async (user: AuthUser | undefined, data: unknown) => {'
);

content = content.replace(
  'export const getAllStudents = async (\n  user,\n  { page = 1, limit = 50, centerId, programId, isActive, search } = {},\n) => {',
  'export const getAllStudents = async (\n  user: AuthUser | undefined,\n  { page = 1, limit = 50, centerId, programId, isActive, search }: Record<string, unknown> = {},\n) => {'
);
content = content.replace(
  'export const getAllStudents = async (\n  user,\n  { page = 1, limit = 50, centerId, programId, isActive, search } = {}\n) => {',
  'export const getAllStudents = async (\n  user: AuthUser | undefined,\n  { page = 1, limit = 50, centerId, programId, isActive, search }: Record<string, unknown> = {}\n) => {'
);


content = content.replace(
  'export const getStudentById = async (user, id) => {',
  'export const getStudentById = async (user: AuthUser | undefined, id: string) => {'
);

content = content.replace(
  'export const updateStudent = async (user, id, data) => {',
  'export const updateStudent = async (user: AuthUser | undefined, id: string, data: unknown) => {'
);

content = content.replace(
  'export const deleteStudent = async (user, id) => {',
  'export const deleteStudent = async (user: AuthUser | undefined, id: string) => {'
);

content = content.replace(
  'export const filterStudents = async (user, query = {}) => {',
  'export const filterStudents = async (user: AuthUser | undefined, query: Record<string, any> = {}) => {'
);

content = content.replace(
  'export const getStudentSummary = async (user, id) => {',
  'export const getStudentSummary = async (user: AuthUser | undefined, id: string) => {'
);

content = content.replace(
  'export const getStudentProfile = async (user, id) => {',
  'export const getStudentProfile = async (user: AuthUser | undefined, id: string) => {'
);

content = content.replace(
  'export const addAttendance = async (user, studentId, data) => {',
  'export const addAttendance = async (user: AuthUser | undefined, studentId: string, data: unknown) => {'
);

content = content.replace(
  'export const getAttendanceByStudent = async (user, studentId) => {',
  'export const getAttendanceByStudent = async (user: AuthUser | undefined, studentId: string) => {'
);

content = content.replace(
  'export const updateAttendance = async (id, data) => {',
  'export const updateAttendance = async (id: number, data: unknown) => {'
);

content = content.replace(
  'export const addSkill = async (user, studentId, data) => {',
  'export const addSkill = async (user: AuthUser | undefined, studentId: string, data: unknown) => {'
);

content = content.replace(
  'export const getSkillsByStudent = async (user, studentId) => {',
  'export const getSkillsByStudent = async (user: AuthUser | undefined, studentId: string) => {'
);

content = content.replace(
  'export const updateSkill = async (id, data) => {',
  'export const updateSkill = async (id: number, data: unknown) => {'
);

content = content.replace(
  'export const addCareer = async (user, studentId, data) => {',
  'export const addCareer = async (user: AuthUser | undefined, studentId: string, data: unknown) => {'
);

content = content.replace(
  'export const getCareersByStudent = async (user, studentId) => {',
  'export const getCareersByStudent = async (user: AuthUser | undefined, studentId: string) => {'
);

content = content.replace(
  'export const updateCareer = async (id, data) => {',
  'export const updateCareer = async (id: number, data: unknown) => {'
);

// Any other errors:
// user.role === "admin" -> wait, user can be undefined.
content = content.replace('if (user.role === "teacher"', 'if (user?.role === "teacher"');
content = content.replace('...(user.role === "admin"', '...(user?.role === "admin"');

// Fix implicitly any parameters in dashboard stats
// "export const getDashboardStats = async () => {" has no arguments, that's fine.

fs.writeFileSync(filePath, content);
console.log('Fixed student.service.ts');

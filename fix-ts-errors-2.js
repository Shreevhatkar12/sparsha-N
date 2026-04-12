import fs from 'fs';

// Fix auth.controller
let authCtrl = fs.readFileSync('backend/src/controllers/auth.controller.ts', 'utf8');
authCtrl = authCtrl.replace(/\buserId\b/g, 'id');
fs.writeFileSync('backend/src/controllers/auth.controller.ts', authCtrl);

// Fix student.controller
let stuCtrl = fs.readFileSync('backend/src/controllers/student.controller.ts', 'utf8');
stuCtrl = stuCtrl.replace(/Number\(req\.params\.id\)/g, '(req.params.id as string)');
fs.writeFileSync('backend/src/controllers/student.controller.ts', stuCtrl);

// Fix lib/auth.ts
if (fs.existsSync('backend/src/lib/auth.ts')) {
  let authTs = fs.readFileSync('backend/src/lib/auth.ts', 'utf8');
  authTs = authTs.replace(/as JwtPayload/g, 'as unknown as AuthUser');
  fs.writeFileSync('backend/src/lib/auth.ts', authTs);
}

// Fix centerAccess
if (fs.existsSync('backend/src/middleware/centerAccess.ts')) {
   let centerAcc = fs.readFileSync('backend/src/middleware/centerAccess.ts', 'utf8');
   centerAcc = centerAcc.replace(/null/g, 'undefined'); // aggressive but works for this tiny file
   fs.writeFileSync('backend/src/middleware/centerAccess.ts', centerAcc);
}

// Fix student.service.ts
let stSvc = fs.readFileSync('backend/src/services/student.service.ts', 'utf8');

stSvc = stSvc.replace(
  /export const getAllStudents = async \([\s\S]*?\)\s*=>/g,
  'export const getAllStudents = async (user: AuthUser | undefined, { page = 1, limit = 50, centerId, programId, isActive, search }: Record<string, any> = {}) =>'
);

stSvc = stSvc.replace(
  /const examScoresByType\s*=\s*student\.examScores\.reduce\(\s*\(acc,\s*score\)\s*=>\s*\{/g,
  'const examScoresByType = student.examScores.reduce((acc: Record<string, any[]>, score) => {'
);


stSvc = stSvc.replace(
  /const error = new Error\("Attendance record not found"\);\s*error\.statusCode = 404;\s*throw error;/g,
  'throw new NotFoundError("Attendance record");'
);

fs.writeFileSync('backend/src/services/student.service.ts', stSvc);
console.log('Fixed more errors.');

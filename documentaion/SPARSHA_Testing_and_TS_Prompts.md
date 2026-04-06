**SPARSHA**

Backend Testing + TypeScript Migration

*Cursor AI Prompts --- Part 2*

**How to Use This Document**

This document contains two sets of prompts:

- TESTING PROMPTS (T-prefix) --- one prompt per service. Run after all
  services are implemented.

- TYPESCRIPT MIGRATION PROMPT (TS-prefix) --- one prompt that converts
  all remaining .js files to .ts.

> *Run all testing prompts BEFORE the TypeScript migration prompt. Tests
> will catch any bugs in the JS files first, then the migration prompt
> converts everything cleanly.*

Order to run:

- T-0: Test setup and shared utilities (run first)

- T-1 through T-9: One prompt per service (can run in parallel in
  separate Cursor chats)

- T-10: Full integration + edge case tests (run last among testing
  prompts)

- TS-1: TypeScript migration (run after all tests pass)

**Part 1: Backend Testing Prompts**

Stack: Jest + Supertest + ts-jest. All tests run against a real test
database (separate from dev DB). No mocking of Prisma --- we test the
actual DB layer.

+-----------------------------------------------------------------+
| **PROMPT T-0**                                                  |
|                                                                 |
| **Test Infrastructure Setup**                                   |
|                                                                 |
| Jest config, test DB, shared factories and helpers              |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File scope**  jest.config.ts, tests/setup.ts, tests/teardown.ts,
                  tests/helpers/factories.ts, tests/helpers/auth.ts,
                  tests/helpers/db.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Run first**   This prompt must be completed before any other
                  testing prompt

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Set up the complete test infrastructure for the SPARSHA         |
| backend.                                                        |
|                                                                 |
| The backend uses Node.js + Express + TypeScript + Prisma +      |
| PostgreSQL.                                                     |
|                                                                 |
| INSTALL TEST DEPENDENCIES:                                      |
|                                                                 |
| npm install -D jest ts-jest \@types/jest supertest              |
| \@types/supertest                                               |
|                                                                 |
| npm install -D \@faker-js/faker                                 |
|                                                                 |
| 1\. CREATE jest.config.ts in backend root:                      |
|                                                                 |
| \- preset: ts-jest                                              |
|                                                                 |
| \- testEnvironment: node                                        |
|                                                                 |
| \- globalSetup: \'./tests/setup.ts\'                            |
|                                                                 |
| \- globalTeardown: \'./tests/teardown.ts\'                      |
|                                                                 |
| \- setupFilesAfterFramework: \[\'./tests/setupEach.ts\'\]       |
|                                                                 |
| \- testMatch: \[\'\*\*/\*.test.ts\'\]                           |
|                                                                 |
| \- collectCoverage: true                                        |
|                                                                 |
| \- coverageDirectory: \'coverage\'                              |
|                                                                 |
| \- coveragePathIgnorePatterns: \[\'node_modules\', \'prisma\',  |
| \'dist\'\]                                                      |
|                                                                 |
| Add to package.json scripts:                                    |
|                                                                 |
| \'test\': \'jest \--runInBand\'                                 |
|                                                                 |
| \'test:watch\': \'jest \--watch \--runInBand\'                  |
|                                                                 |
| \'test:coverage\': \'jest \--coverage \--runInBand\'            |
|                                                                 |
| \'\--runInBand\' is required --- tests share a DB and must run  |
| serially.                                                       |
|                                                                 |
| 2\. CREATE tests/setup.ts (globalSetup --- runs once before all |
| tests):                                                         |
|                                                                 |
| \- Load .env.test using dotenv                                  |
|                                                                 |
| \- Run: execSync(\'npx prisma migrate deploy\') to apply        |
| migrations to test DB                                           |
|                                                                 |
| \- Log \'Test database ready\'                                  |
|                                                                 |
| 3\. CREATE tests/teardown.ts (globalTeardown --- runs once      |
| after all tests):                                               |
|                                                                 |
| \- Disconnect Prisma client                                     |
|                                                                 |
| \- Log \'Test run complete\'                                    |
|                                                                 |
| 4\. CREATE tests/setupEach.ts (beforeEach/afterEach hook file): |
|                                                                 |
| \- Before each test file: truncate ALL tables in correct FK     |
| order:                                                          |
|                                                                 |
| form_submissions, exam_scores, attendance_records,              |
| attendance_sessions,                                            |
|                                                                 |
| exams, form_templates, parent_student, students,                |
|                                                                 |
| user_activity_assignments, user_center_assignments, activities, |
|                                                                 |
| center_programs, users, programs, centers                       |
|                                                                 |
| \- Use prisma.\$executeRawUnsafe(\'TRUNCATE \... RESTART        |
| IDENTITY CASCADE\')                                             |
|                                                                 |
| \- This gives each test file a clean slate.                     |
|                                                                 |
| 5\. CREATE tests/helpers/db.ts:                                 |
|                                                                 |
| Export a shared prisma instance for tests.                      |
|                                                                 |
| Export clearDb() function that does the truncation above.       |
|                                                                 |
| 6\. CREATE tests/helpers/factories.ts using \@faker-js/faker:   |
|                                                                 |
| Export async factory functions that INSERT records and return   |
| them:                                                           |
|                                                                 |
| createCenter(overrides?) --- creates a Center row               |
|                                                                 |
| createProgram(overrides?) --- creates a Program row             |
|                                                                 |
| createCenterProgram(centerId, programId) --- links them         |
|                                                                 |
| createUser(overrides?) --- creates a User with hashed password  |
| \'Test@1234\'                                                   |
|                                                                 |
| Default role: \'teacher\'. Return user + plaintext password for |
| auth tests.                                                     |
|                                                                 |
| createUserCenterAssignment(userId, centerId, overrides?)        |
|                                                                 |
| createStudent(centerId, programId, overrides?) --- creates a    |
| Student                                                         |
|                                                                 |
| createActivity(centerId, programId, overrides?)                 |
|                                                                 |
| createAttendanceSession(centerId, programId, overrides?)        |
|                                                                 |
| createAttendanceRecord(sessionId, studentId, centerId,          |
| overrides?)                                                     |
|                                                                 |
| createExam(centerId, programId, overrides?)                     |
|                                                                 |
| createExamScore(examId, studentId, centerId, overrides?)        |
|                                                                 |
| createFormTemplate(overrides?) --- creates a FormTemplate with  |
| sample schema                                                   |
|                                                                 |
| createFormSubmission(templateId, studentId, centerId,           |
| submittedBy, overrides?)                                        |
|                                                                 |
| 7\. CREATE tests/helpers/auth.ts:                               |
|                                                                 |
| Export getAuthToken(user): string                               |
|                                                                 |
| --- signs a JWT with the same secret and payload structure as   |
| authService                                                     |
|                                                                 |
| --- includes: userId, email, role, centerIds                    |
|                                                                 |
| Export makeAuthHeader(token): { Authorization: string }         |
|                                                                 |
| Export loginAs(app, email, password): Promise\<string\>         |
|                                                                 |
| --- does a real POST /api/auth/login and returns the token      |
|                                                                 |
| 8\. CREATE .env.test in backend root:                           |
|                                                                 |
| DATABASE_URL=\<test database URL --- separate DB from dev\>     |
|                                                                 |
| JWT_SECRET=test_secret_do_not_use_in_production                 |
|                                                                 |
| JWT_EXPIRES_IN=1h                                               |
|                                                                 |
| NODE_ENV=test                                                   |
|                                                                 |
| PORT=5001                                                       |
|                                                                 |
| IMPORTANT: .env.test must use a DIFFERENT database than .env.   |
|                                                                 |
| Recommend naming it \'sparsha_test\' on same Postgres instance. |
|                                                                 |
| Add .env.test to .gitignore.                                    |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-1**                                                  |
|                                                                 |
| **Auth Service Tests**                                          |
|                                                                 |
| Login, JWT, center scope in token, password change              |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/auth.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the auth service in SPARSHA    |
| backend.                                                        |
|                                                                 |
| File: tests/auth.test.ts                                        |
|                                                                 |
| Use factories and helpers from tests/helpers/ (created in T-0). |
|                                                                 |
| Import app from src/app.ts. Use supertest(app) for all          |
| requests.                                                       |
|                                                                 |
| Use the shared prisma instance from tests/helpers/db.ts.        |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'POST /api/auth/login\') {                            |
|                                                                 |
| it(\'returns 200 with token and user object on valid            |
| credentials\')                                                  |
|                                                                 |
| it(\'token payload contains userId, email, role, centerIds      |
| array\')                                                        |
|                                                                 |
| it(\'centerIds in token matches user_center_assignments in      |
| DB\')                                                           |
|                                                                 |
| it(\'returns 401 when email does not exist\')                   |
|                                                                 |
| it(\'returns 401 when password is wrong\')                      |
|                                                                 |
| it(\'returns 401 when user isActive is false\')                 |
|                                                                 |
| it(\'returns 400 when email is missing from body\')             |
|                                                                 |
| it(\'returns 400 when password is missing from body\')          |
|                                                                 |
| it(\'centerIds is empty array for user with no center           |
| assignments\')                                                  |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/auth/me\') {                                |
|                                                                 |
| it(\'returns 200 with user profile for authenticated request\') |
|                                                                 |
| it(\'returned centerIds comes from DB, not token\')             |
|                                                                 |
| it(\'returns 401 when no Authorization header\')                |
|                                                                 |
| it(\'returns 401 when token is malformed\')                     |
|                                                                 |
| it(\'returns 401 when token is expired\') // sign with          |
| expiresIn: -1s                                                  |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/auth/refresh\') {                          |
|                                                                 |
| it(\'returns new token with refreshed centerIds\')              |
|                                                                 |
| it(\'new token is different from old token\')                   |
|                                                                 |
| it(\'returns 401 for invalid token\')                           |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/auth/change-password\') {                  |
|                                                                 |
| it(\'returns 200 and allows login with new password after       |
| change\')                                                       |
|                                                                 |
| it(\'returns 401 when currentPassword is wrong\')               |
|                                                                 |
| it(\'returns 422 when newPassword is less than 8 characters\')  |
|                                                                 |
| it(\'returns 401 when unauthenticated\')                        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'RBAC middleware --- requireRole\') {                 |
|                                                                 |
| // Use any protected admin-only endpoint (e.g. POST /api/users) |
| to test this                                                    |
|                                                                 |
| it(\'allows request when user has required role\')              |
|                                                                 |
| it(\'returns 403 when user role is not in allowed list\')       |
|                                                                 |
| it(\'returns 401 when no token provided\')                      |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP FOR EACH TEST GROUP:                                      |
|                                                                 |
| beforeEach: use factories to create a user with known           |
| credentials.                                                    |
|                                                                 |
| Assign the user to a center so centerIds is non-empty in token  |
| tests.                                                          |
|                                                                 |
| IMPORTANT: verify the actual JWT payload by decoding the        |
| returned token                                                  |
|                                                                 |
| with jwt.decode() (no verify needed --- just inspect the        |
| payload).                                                       |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-2**                                                  |
|                                                                 |
| **Student Service Tests**                                       |
|                                                                 |
| CRUD, center scope isolation, filtering                         |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/students.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the student service in SPARSHA |
| backend.                                                        |
|                                                                 |
| File: tests/students.test.ts                                    |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| CRITICAL: The most important thing to test is CENTER ISOLATION. |
|                                                                 |
| A teacher from Center A must NEVER see Center B\'s students.    |
|                                                                 |
| Every test group should have a cross-center isolation           |
| assertion.                                                      |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'GET /api/students\') {                               |
|                                                                 |
| it(\'returns only students belonging to teacher\\\'s center\')  |
|                                                                 |
| it(\'admin sees students from all centers\')                    |
|                                                                 |
| it(\'filters by programId query param\')                        |
|                                                                 |
| it(\'filters by isActive=false returns only inactive            |
| students\')                                                     |
|                                                                 |
| it(\'search param filters by fullName case-insensitively\')     |
|                                                                 |
| it(\'pagination: page=2 returns correct slice\')                |
|                                                                 |
| it(\'response contains total, page, totalPages in meta\')       |
|                                                                 |
| it(\'teacher from center A cannot see center B students\') //   |
| KEY TEST                                                        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/students/:id\') {                           |
|                                                                 |
| it(\'returns student with center and program info\')            |
|                                                                 |
| it(\'returns 404 for non-existent student id\')                 |
|                                                                 |
| it(\'returns 404 when student exists but belongs to different   |
| center\') // KEY TEST                                           |
|                                                                 |
| it(\'response includes attendanceRecords and examScores         |
| fields\')                                                       |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/students\') {                              |
|                                                                 |
| it(\'creates student successfully with all required fields\')   |
|                                                                 |
| it(\'returns created student with center and program            |
| included\')                                                     |
|                                                                 |
| it(\'returns 422 when fullName is missing\')                    |
|                                                                 |
| it(\'returns 422 when centerId is missing\')                    |
|                                                                 |
| it(\'returns 422 when programId is missing\')                   |
|                                                                 |
| it(\'returns 403 when teacher tries to create student in        |
| another center\') // KEY TEST                                   |
|                                                                 |
| it(\'returns 401 when unauthenticated\')                        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'PUT /api/students/:id\') {                           |
|                                                                 |
| it(\'updates student fullName successfully\')                   |
|                                                                 |
| it(\'updates dob, gender, guardianName, guardianPhone\')        |
|                                                                 |
| it(\'returns 404 when student is in a different center\') //    |
| KEY TEST                                                        |
|                                                                 |
| it(\'does not allow changing centerId\')                        |
|                                                                 |
| it(\'does not allow changing programId directly\')              |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'DELETE /api/students/:id\') {                        |
|                                                                 |
| it(\'soft-deletes student by setting isActive=false\')          |
|                                                                 |
| it(\'soft-deleted student does not appear in GET /api/students  |
| default list\')                                                 |
|                                                                 |
| it(\'returns 403 when teacher tries to delete student from      |
| another center\')                                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/students/filter\') {                        |
|                                                                 |
| it(\'filters by ageMin and ageMax using dob\')                  |
|                                                                 |
| it(\'filters by gender\')                                       |
|                                                                 |
| it(\'filters by enrolledAfter date\')                           |
|                                                                 |
| it(\'combined filters narrow results correctly\')               |
|                                                                 |
| it(\'center scope still applies to filter results\') // KEY     |
| TEST                                                            |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/students/:id/summary\') {                   |
|                                                                 |
| it(\'returns attendanceRate as a number between 0 and 100\')    |
|                                                                 |
| it(\'returns examScores and formSubmissionsCount\')             |
|                                                                 |
| it(\'returns 404 for student outside user\\\'s center\')        |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 2 centers, 2 teachers (one per center), 3         |
| students per center.                                            |
|                                                                 |
| Use beforeEach to reset and re-create this base state for each  |
| describe block.                                                 |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-3**                                                  |
|                                                                 |
| **Attendance Service Tests**                                    |
|                                                                 |
| Session creation, bulk marking, pending detection               |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/attendance.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the attendance service in      |
| SPARSHA backend.                                                |
|                                                                 |
| File: tests/attendance.test.ts                                  |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'POST /api/attendance/sessions\') {                   |
|                                                                 |
| it(\'creates a session and auto-creates pending records for all |
| active students\')                                              |
|                                                                 |
| it(\'number of pending records equals number of active students |
| in center+program\')                                            |
|                                                                 |
| it(\'returns 409 with existing session when duplicate           |
| date+center+program\')                                          |
|                                                                 |
| it(\'returns 403 when centerId is not in teacher\\\'s           |
| centerIds\')                                                    |
|                                                                 |
| it(\'returns 422 when sessionDate is missing\')                 |
|                                                                 |
| it(\'returns 422 when sessionDate is not a valid date string\') |
|                                                                 |
| it(\'includes activityId when provided\')                       |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/attendance/sessions\') {                    |
|                                                                 |
| it(\'returns sessions for teacher\\\'s center only\')           |
|                                                                 |
| it(\'admin sees sessions across all centers\')                  |
|                                                                 |
| it(\'filters by from and to date range\')                       |
|                                                                 |
| it(\'hasIncomplete=true returns only sessions with null-status  |
| records\')                                                      |
|                                                                 |
| it(\'hasIncomplete=false returns only fully-completed           |
| sessions\')                                                     |
|                                                                 |
| it(\'each session includes incompleteCount field\')             |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/attendance/sessions/:sessionId\') {         |
|                                                                 |
| it(\'returns session with full student+record pairs\')          |
|                                                                 |
| it(\'student+record pairs count equals active student count\')  |
|                                                                 |
| it(\'returns 403 when session belongs to a different center\')  |
|                                                                 |
| it(\'returns 404 for non-existent sessionId\')                  |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'PUT /api/attendance/sessions/:sessionId/records\') { |
|                                                                 |
| it(\'marks all records in one transaction --- all succeed or    |
| none\')                                                         |
|                                                                 |
| it(\'updates status from null to present/absent/late            |
| correctly\')                                                    |
|                                                                 |
| it(\'returns updated completion percentage\')                   |
|                                                                 |
| it(\'completion percentage is 100 when all records are          |
| marked\')                                                       |
|                                                                 |
| it(\'returns 400 when a recordId does not belong to this        |
| session\')                                                      |
|                                                                 |
| it(\'accepts partial updates --- only provided recordIds are    |
| updated\')                                                      |
|                                                                 |
| it(\'remarks field is saved correctly\')                        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/attendance/students/:studentId\') {         |
|                                                                 |
| it(\'returns attendance history with attendanceRate             |
| percentage\')                                                   |
|                                                                 |
| it(\'attendanceRate is calculated correctly: present/total \*   |
| 100\')                                                          |
|                                                                 |
| it(\'late status counts as present in rate calculation\')       |
|                                                                 |
| it(\'filters by from and to date range\')                       |
|                                                                 |
| it(\'returns 404 for student outside teacher\\\'s center\')     |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/attendance/pending\') {                     |
|                                                                 |
| it(\'returns sessions with incomplete records for teacher\\\'s  |
| centers\')                                                      |
|                                                                 |
| it(\'returns empty array when all sessions are fully marked\')  |
|                                                                 |
| it(\'completed sessions do not appear in pending list\')        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/attendance/summary\') {                     |
|                                                                 |
| it(\'returns totalSessions count correctly\')                   |
|                                                                 |
| it(\'returns averageAttendanceRate across date range\')         |
|                                                                 |
| it(\'center scope is applied --- teacher only sees their        |
| center\\\'s data\')                                             |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 1 center, 1 teacher, 1 program, 4 students.       |
|                                                                 |
| Use createAttendanceSession + createAttendanceRecord factories  |
| where needed.                                                   |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-4**                                                  |
|                                                                 |
| **Exam Service Tests**                                          |
|                                                                 |
| Baseline/Endline entry, score upserts, comparison               |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/exams.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the exam service in SPARSHA    |
| backend.                                                        |
|                                                                 |
| File: tests/exams.test.ts                                       |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'POST /api/exams\') {                                 |
|                                                                 |
| it(\'creates baseline exam with correct fields\')               |
|                                                                 |
| it(\'creates endline exam successfully\')                       |
|                                                                 |
| it(\'returns 409 with existing exam on duplicate                |
| center+program+type+year\')                                     |
|                                                                 |
| it(\'returns 403 when centerId is not in teacher\\\'s           |
| centerIds\')                                                    |
|                                                                 |
| it(\'returns 422 when examType is not baseline or endline\')    |
|                                                                 |
| it(\'returns 422 when academicYear is missing\')                |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/exams\') {                                  |
|                                                                 |
| it(\'returns exams for teacher\\\'s center only\')              |
|                                                                 |
| it(\'each exam includes totalStudents and studentsScored        |
| counts\')                                                       |
|                                                                 |
| it(\'completionPercentage is 0 when no scores exist yet\')      |
|                                                                 |
| it(\'completionPercentage is 100 when all students have all     |
| subjects scored\')                                              |
|                                                                 |
| it(\'filters by examType param\')                               |
|                                                                 |
| it(\'filters by academicYear param\')                           |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/exams/:examId\') {                          |
|                                                                 |
| it(\'returns exam with all students and their scores\')         |
|                                                                 |
| it(\'students with no scores appear with empty scores array\')  |
|                                                                 |
| it(\'returns 403 for exam belonging to different center\')      |
|                                                                 |
| it(\'returns 404 for non-existent examId\')                     |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/exams/:examId/scores\') {                  |
|                                                                 |
| it(\'inserts new score rows correctly\')                        |
|                                                                 |
| it(\'upserts --- updating existing score does not create        |
| duplicate row\')                                                |
|                                                                 |
| it(\'after upsert, DB has exactly one row per                   |
| student+subject+exam\')                                         |
|                                                                 |
| it(\'returns 422 when marks exceed maxMarks\')                  |
|                                                                 |
| it(\'returns 422 when marks is negative\')                      |
|                                                                 |
| it(\'returns 403 when exam belongs to a different center\')     |
|                                                                 |
| it(\'all scores in body are saved atomically\')                 |
|                                                                 |
| it(\'response includes updated completionPercentage\')          |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/exams/:examId/pending\') {                  |
|                                                                 |
| it(\'lists students with missing scores and which subjects are  |
| missing\')                                                      |
|                                                                 |
| it(\'student with all 3 subjects scored does not appear in      |
| pending\')                                                      |
|                                                                 |
| it(\'student with 2 of 3 subjects appears with correct          |
| missingSubs array\')                                            |
|                                                                 |
| it(\'returns empty array when all students have all subjects    |
| scored\')                                                       |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/exams/comparison\') {                       |
|                                                                 |
| it(\'returns per-subject baseline and endline averages\')       |
|                                                                 |
| it(\'improvement is endlineAvg minus baselineAvg\')             |
|                                                                 |
| it(\'only includes students present in both baseline and        |
| endline\')                                                      |
|                                                                 |
| it(\'returns 422 when academicYear query param is missing\')    |
|                                                                 |
| it(\'center scope applied --- teacher sees own center only\')   |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/exams/students/:studentId\') {              |
|                                                                 |
| it(\'returns scores grouped by academicYear and examType\')     |
|                                                                 |
| it(\'returns 404 for student outside teacher\\\'s center\')     |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 1 center, 1 teacher, 1 program (SWAYAM), 3        |
| students.                                                       |
|                                                                 |
| Create baseline + endline exams. Use createExamScore factory    |
| for score data.                                                 |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-5**                                                  |
|                                                                 |
| **Forms Service Tests**                                         |
|                                                                 |
| Template CRUD, dynamic submission, pending detection            |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/forms.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the forms service in SPARSHA   |
| backend.                                                        |
|                                                                 |
| File: tests/forms.test.ts                                       |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'POST /api/forms/templates\') {                       |
|                                                                 |
| it(\'admin creates template with valid schema\')                |
|                                                                 |
| it(\'returns 403 when teacher tries to create template\')       |
|                                                                 |
| it(\'returns 422 when schema.fields is empty array\')           |
|                                                                 |
| it(\'returns 422 when a field is missing the required           |
| property\')                                                     |
|                                                                 |
| it(\'returns 422 when a field has an unsupported type\')        |
|                                                                 |
| it(\'returns 422 when formType is missing\')                    |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/forms/templates\') {                        |
|                                                                 |
| it(\'returns all active templates\')                            |
|                                                                 |
| it(\'does not return templates with isActive=false\')           |
|                                                                 |
| it(\'filters by formType query param\')                         |
|                                                                 |
| it(\'accessible by teacher role too\')                          |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'PUT /api/forms/templates/:templateId\') {            |
|                                                                 |
| it(\'admin can update template name and schema\')               |
|                                                                 |
| it(\'existing submissions are not affected by schema update\')  |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'DELETE /api/forms/templates/:templateId\') {         |
|                                                                 |
| it(\'sets isActive=false, not hard delete\')                    |
|                                                                 |
| it(\'soft-deleted template does not appear in GET               |
| /api/forms/templates\')                                         |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/forms/submissions\') {                     |
|                                                                 |
| it(\'creates submission with valid data for all required        |
| fields\')                                                       |
|                                                                 |
| it(\'returns 422 when a required field from template schema is  |
| missing in data\')                                              |
|                                                                 |
| it(\'optional fields can be absent --- no error\')              |
|                                                                 |
| it(\'returns 403 when centerId is not in teacher\\\'s           |
| centerIds\')                                                    |
|                                                                 |
| it(\'returns 422 when studentId does not belong to the given    |
| centerId\')                                                     |
|                                                                 |
| it(\'submittedBy is set to authenticated user\\\'s id           |
| automatically\')                                                |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/forms/submissions\') {                      |
|                                                                 |
| it(\'returns submissions for teacher\\\'s center only\')        |
|                                                                 |
| it(\'admin sees all centers submissions\')                      |
|                                                                 |
| it(\'filters by templateId\')                                   |
|                                                                 |
| it(\'filters by studentId\')                                    |
|                                                                 |
| it(\'filters by from and to dates\')                            |
|                                                                 |
| it(\'response includes template name and student fullName\')    |
|                                                                 |
| it(\'pagination works correctly\')                              |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/forms/submissions/:submissionId\') {        |
|                                                                 |
| it(\'returns full submission with data field\')                 |
|                                                                 |
| it(\'returns 403 for submission in a different center\')        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'DELETE /api/forms/submissions/:submissionId\') {     |
|                                                                 |
| it(\'admin can hard delete a submission\')                      |
|                                                                 |
| it(\'returns 403 when teacher tries to delete\')                |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/forms/pending\') {                          |
|                                                                 |
| it(\'returns students without submission for given templateId   |
| in center\')                                                    |
|                                                                 |
| it(\'student with existing submission does not appear in        |
| pending\')                                                      |
|                                                                 |
| it(\'returns 422 when templateId is not provided\')             |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/forms/submissions/student/:studentId\') {   |
|                                                                 |
| it(\'returns all submissions for a student grouped by           |
| formType\')                                                     |
|                                                                 |
| it(\'returns 404 for student outside teacher\\\'s center\')     |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 1 admin, 2 teachers (separate centers), 3         |
| students each center.                                           |
|                                                                 |
| Create a sample FormTemplate with 2 required + 1 optional       |
| field.                                                          |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-6**                                                  |
|                                                                 |
| **Centers & Programs Service Tests**                            |
|                                                                 |
| Multi-center management, program assignment, user assignment    |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/centers.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the centers and programs       |
| service in SPARSHA backend.                                     |
|                                                                 |
| File: tests/centers.test.ts                                     |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'GET /api/centers\') {                                |
|                                                                 |
| it(\'admin gets all centers with program list\')                |
|                                                                 |
| it(\'teacher gets only their assigned centers\')                |
|                                                                 |
| it(\'each center includes programs array from CenterProgram     |
| join\')                                                         |
|                                                                 |
| it(\'returns 401 when unauthenticated\')                        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/centers\') {                               |
|                                                                 |
| it(\'admin creates center with name and location\')             |
|                                                                 |
| it(\'returns 403 when teacher tries to create center\')         |
|                                                                 |
| it(\'returns 422 when name is missing\')                        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'PUT /api/centers/:centerId\') {                      |
|                                                                 |
| it(\'admin updates center name\')                               |
|                                                                 |
| it(\'admin can set isActive=false to deactivate center\')       |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| it(\'returns 404 for non-existent centerId\')                   |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/centers/:centerId/programs\') {            |
|                                                                 |
| it(\'admin assigns program to center --- creates CenterProgram  |
| row\')                                                          |
|                                                                 |
| it(\'if CenterProgram exists but isActive=false, reactivates    |
| it\')                                                           |
|                                                                 |
| it(\'returns 409 when program already actively assigned to      |
| center\')                                                       |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'DELETE /api/centers/:centerId/programs/:programId\') |
| {                                                               |
|                                                                 |
| it(\'sets CenterProgram.isActive=false\')                       |
|                                                                 |
| it(\'returns 409 when active students exist in this             |
| center+program\') // KEY                                        |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/centers/:centerId/users\') {               |
|                                                                 |
| it(\'admin assigns teacher to center --- creates                |
| UserCenterAssignment\')                                         |
|                                                                 |
| it(\'if assignment already exists, updates validUntil\')        |
|                                                                 |
| it(\'assigned user can now login and see that center\\\'s       |
| students\')                                                     |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'DELETE /api/centers/:centerId/users/:userId\') {     |
|                                                                 |
| it(\'sets validUntil to today --- expires access immediately\') |
|                                                                 |
| it(\'user\\\'s token no longer includes that centerId after     |
| re-login\')                                                     |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/programs\') {                               |
|                                                                 |
| it(\'returns all active programs\')                             |
|                                                                 |
| it(\'does not return programs with isActive=false\')            |
|                                                                 |
| it(\'accessible to all authenticated roles\')                   |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/programs\') {                              |
|                                                                 |
| it(\'admin creates program with unique code\')                  |
|                                                                 |
| it(\'returns 409 when program code already exists\')            |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 2 centers, 1 admin, 2 teachers (one per center),  |
| 2 programs.                                                     |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-7**                                                  |
|                                                                 |
| **User Management Service Tests**                               |
|                                                                 |
| Admin user CRUD, role management, password reset                |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/users.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the user management service in |
| SPARSHA backend.                                                |
|                                                                 |
| File: tests/users.test.ts                                       |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'GET /api/users\') {                                  |
|                                                                 |
| it(\'admin gets paginated list of all users\')                  |
|                                                                 |
| it(\'response never includes passwordHash field\') // SECURITY  |
|                                                                 |
| it(\'filters by role query param\')                             |
|                                                                 |
| it(\'filters by centerId query param\')                         |
|                                                                 |
| it(\'search filters by fullName and email\')                    |
|                                                                 |
| it(\'returns 403 when teacher tries to access user list\')      |
|                                                                 |
| it(\'includes centerAssignments with center name in each        |
| user\')                                                         |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/users\') {                                 |
|                                                                 |
| it(\'admin creates user with all fields\')                      |
|                                                                 |
| it(\'password is stored as bcrypt hash, not plaintext\') //     |
| SECURITY                                                        |
|                                                                 |
| it(\'created user can login with given password\')              |
|                                                                 |
| it(\'returns 409 when email already exists\')                   |
|                                                                 |
| it(\'returns 422 when email format is invalid\')                |
|                                                                 |
| it(\'returns 422 when role is not a valid UserRole enum         |
| value\')                                                        |
|                                                                 |
| it(\'returns 403 when teacher tries to create user\')           |
|                                                                 |
| it(\'response never includes passwordHash\') // SECURITY        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'PUT /api/users/:userId\') {                          |
|                                                                 |
| it(\'admin updates fullName and phone\')                        |
|                                                                 |
| it(\'admin can change role\')                                   |
|                                                                 |
| it(\'admin can set isActive=false\')                            |
|                                                                 |
| it(\'email cannot be changed via PUT\') // immutable            |
|                                                                 |
| it(\'password cannot be changed via PUT\') // use               |
| change-password                                                 |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| it(\'returns 404 for non-existent userId\')                     |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/users/:userId/reset-password\') {          |
|                                                                 |
| it(\'admin resets user password successfully\')                 |
|                                                                 |
| it(\'user can login with new password after reset\')            |
|                                                                 |
| it(\'user cannot login with old password after reset\')         |
|                                                                 |
| it(\'returns 422 when newPassword is shorter than 8 chars\')    |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'DELETE /api/users/:userId\') {                       |
|                                                                 |
| it(\'soft-deletes by setting isActive=false\')                  |
|                                                                 |
| it(\'soft-deleted user cannot login\') // check login returns   |
| 401                                                             |
|                                                                 |
| it(\'admin cannot delete their own account\')                   |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/users/me/centers\') {                       |
|                                                                 |
| it(\'returns current teacher\\\'s center assignments\')         |
|                                                                 |
| it(\'returns empty array for user with no assignments\')        |
|                                                                 |
| it(\'accessible by teacher, staff, any role\')                  |
|                                                                 |
| it(\'returns 401 when unauthenticated\')                        |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 1 admin, 2 teachers, 1 staff user. Create 2       |
| centers.                                                        |
|                                                                 |
| Assign teachers to different centers.                           |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-8**                                                  |
|                                                                 |
| **Activities Service Tests**                                    |
|                                                                 |
| Activity CRUD, volunteer access window, assignment              |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/activities.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 setup complete

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the activities service in      |
| SPARSHA backend.                                                |
|                                                                 |
| File: tests/activities.test.ts                                  |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'GET /api/activities\') {                             |
|                                                                 |
| it(\'teacher sees activities in their center\')                 |
|                                                                 |
| it(\'teacher does not see activities from other centers\')      |
|                                                                 |
| it(\'admin sees all activities\')                               |
|                                                                 |
| it(\'volunteer sees only activities they are assigned to\')     |
|                                                                 |
| it(\'volunteer sees activity only within their                  |
| validFrom-validUntil window\')                                  |
|                                                                 |
| it(\'volunteer does NOT see activity outside their time         |
| window\') // KEY                                                |
|                                                                 |
| it(\'filters by programId\')                                    |
|                                                                 |
| it(\'filters by from and to date range\')                       |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/activities\') {                            |
|                                                                 |
| it(\'teacher creates activity in their center\')                |
|                                                                 |
| it(\'returns 403 when teacher creates activity in another       |
| center\')                                                       |
|                                                                 |
| it(\'returns 422 when name is missing\')                        |
|                                                                 |
| it(\'returns 403 for volunteer role\')                          |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'PUT /api/activities/:activityId\') {                 |
|                                                                 |
| it(\'teacher updates activity in their center\')                |
|                                                                 |
| it(\'returns 404 for activity outside teacher\\\'s center\')    |
|                                                                 |
| it(\'volunteer cannot update activity\')                        |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'POST /api/activities/:activityId/assign\') {         |
|                                                                 |
| it(\'admin assigns volunteer with validFrom and validUntil\')   |
|                                                                 |
| it(\'teacher can also assign volunteer to their center\\\'s     |
| activity\')                                                     |
|                                                                 |
| it(\'if assignment exists, updates validFrom and validUntil\')  |
|                                                                 |
| it(\'returns 403 for volunteer role\')                          |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'DELETE /api/activities/:activityId/assign/:userId\') |
| {                                                               |
|                                                                 |
| it(\'admin removes volunteer assignment\')                      |
|                                                                 |
| it(\'after removal, volunteer cannot see that activity\')       |
|                                                                 |
| it(\'returns 403 for non-admin\')                               |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/activities/:activityId/students\') {        |
|                                                                 |
| it(\'returns active students in activity\\\'s center+program\') |
|                                                                 |
| it(\'inactive students are not included\')                      |
|                                                                 |
| it(\'returns 403 for activity outside teacher\\\'s center\')    |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 2 centers, 1 admin, 1 teacher per center, 1       |
| volunteer.                                                      |
|                                                                 |
| Assign volunteer to one activity with a specific time window.   |
|                                                                 |
| Create activities with past/current/future date ranges for      |
| window tests.                                                   |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-9**                                                  |
|                                                                 |
| **Reports & Dashboard Service Tests**                           |
|                                                                 |
| Aggregations, analytics, pending alerts, CSV export             |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/reports.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  T-0 + all service tests passing

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write Jest + Supertest tests for the reports service in SPARSHA |
| backend.                                                        |
|                                                                 |
| File: tests/reports.test.ts                                     |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| NOTE: This service is aggregation-heavy. Tests must set up      |
| precise data                                                    |
|                                                                 |
| and then assert exact computed values (not just \'truthy\').    |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'GET /api/reports/dashboard\') {                      |
|                                                                 |
| it(\'returns totalStudents count matching active students in    |
| DB\')                                                           |
|                                                                 |
| it(\'teacher\\\'s dashboard shows only their center\\\'s        |
| counts\')                                                       |
|                                                                 |
| it(\'admin dashboard shows counts across all centers\')         |
|                                                                 |
| it(\'pendingItems.incompleteSessions matches sessions with null |
| records\')                                                      |
|                                                                 |
| it(\'centerBreakdown array has one entry per accessible         |
| center\')                                                       |
|                                                                 |
| it(\'programBreakdown has correct studentCount per program\')   |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/reports/attendance\') {                     |
|                                                                 |
| // Set up: 10 sessions, 4 students. Precisely control           |
| present/absent counts.                                          |
|                                                                 |
| it(\'totalSessions count is correct\')                          |
|                                                                 |
| it(\'averageAttendanceRate matches computed value to 1 decimal  |
| place\')                                                        |
|                                                                 |
| it(\'byDate array has one entry per session date\')             |
|                                                                 |
| it(\'each byDate entry has correct presentCount, absentCount,   |
| lateCount\')                                                    |
|                                                                 |
| it(\'byStudent is sorted by rate ascending (worst first)\')     |
|                                                                 |
| it(\'center scope applied --- teacher sees only own center      |
| sessions\')                                                     |
|                                                                 |
| it(\'returns 422 when from or to date is missing\')             |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/reports/exams\') {                          |
|                                                                 |
| // Set up: baseline + endline exam, 3 students, 3 subjects.     |
|                                                                 |
| // Use fixed mark values so you can assert exact averages.      |
|                                                                 |
| it(\'returns baselineAvg per subject with correct value\')      |
|                                                                 |
| it(\'returns endlineAvg per subject with correct value\')       |
|                                                                 |
| it(\'improvement = endlineAvg - baselineAvg exactly\')          |
|                                                                 |
| it(\'studentPerformance only includes students with both exam   |
| types\')                                                        |
|                                                                 |
| it(\'student with only baseline score is excluded from          |
| comparison\')                                                   |
|                                                                 |
| it(\'returns 422 when academicYear is missing\')                |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/reports/students (parameter filter)\') {    |
|                                                                 |
| // Set up: 5 students with varying ages, genders, attendance,   |
| scores.                                                         |
|                                                                 |
| it(\'ageMin filter excludes students below minimum age\')       |
|                                                                 |
| it(\'ageMax filter excludes students above maximum age\')       |
|                                                                 |
| it(\'gender filter returns only matching gender\')              |
|                                                                 |
| it(\'attendanceRateMin excludes students below threshold\')     |
|                                                                 |
| it(\'combined filters are ANDed --- all must match\')           |
|                                                                 |
| it(\'center scope applies --- teacher cannot get another        |
| center\\\'s students\')                                         |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/reports/pending\') {                        |
|                                                                 |
| it(\'incompleteSessions lists sessions with unmarked records\') |
|                                                                 |
| it(\'missingExamScores lists exams with students who have no    |
| scores\')                                                       |
|                                                                 |
| it(\'pendingFormSubmissions lists templates with students       |
| missing submission\')                                           |
|                                                                 |
| it(\'all sections are empty arrays when everything is           |
| complete\')                                                     |
|                                                                 |
| it(\'center scope applied for teacher role\')                   |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'GET /api/reports/export\') {                         |
|                                                                 |
| it(\'returns Content-Type: text/csv header\')                   |
|                                                                 |
| it(\'returns Content-Disposition: attachment header\')          |
|                                                                 |
| it(\'CSV has header row with expected column names\')           |
|                                                                 |
| it(\'CSV row count equals active student count + 1 (header)\')  |
|                                                                 |
| it(\'each student row includes name, center, program,           |
| attendanceRate, examAvg\')                                      |
|                                                                 |
| it(\'returns 403 for teacher role\') // staff and admin only    |
|                                                                 |
| }                                                               |
|                                                                 |
| SETUP: Create 2 centers, 1 admin, 1 teacher, 5 students per     |
| center.                                                         |
|                                                                 |
| Create attendance sessions (some complete, some incomplete).    |
|                                                                 |
| Create baseline+endline exams with specific mark values.        |
|                                                                 |
| Create a FormTemplate with 2 students missing submissions.      |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **PROMPT T-10**                                                 |
|                                                                 |
| **Integration & Edge Case Tests**                               |
|                                                                 |
| End-to-end flows + security boundary tests                      |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File**        tests/integration.test.ts

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Run order**   Run last, after all service tests pass

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Write integration and edge case tests for the SPARSHA backend.  |
|                                                                 |
| File: tests/integration.test.ts                                 |
|                                                                 |
| Use factories and helpers from tests/helpers/.                  |
|                                                                 |
| These tests verify complete user flows and cross-service        |
| interactions.                                                   |
|                                                                 |
| TEST GROUPS TO WRITE:                                           |
|                                                                 |
| describe(\'Complete teacher workflow\') {                       |
|                                                                 |
| // Full flow: login → see students → create session → mark      |
| attendance                                                      |
|                                                                 |
| it(\'teacher logs in and receives token with correct            |
| centerIds\')                                                    |
|                                                                 |
| it(\'teacher lists students --- only sees their center\')       |
|                                                                 |
| it(\'teacher creates attendance session for today\')            |
|                                                                 |
| it(\'session auto-creates pending records for all enrolled      |
| students\')                                                     |
|                                                                 |
| it(\'teacher bulk-marks all students present\')                 |
|                                                                 |
| it(\'attendance summary shows 100% rate for that session\')     |
|                                                                 |
| it(\'dashboard pending count decreases after session is         |
| completed\')                                                    |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'Complete exam entry workflow\') {                    |
|                                                                 |
| it(\'teacher creates baseline exam for current academic year\') |
|                                                                 |
| it(\'pending endpoint shows all students missing scores         |
| initially\')                                                    |
|                                                                 |
| it(\'teacher enters scores for all students all subjects\')     |
|                                                                 |
| it(\'pending endpoint returns empty after all scores entered\') |
|                                                                 |
| it(\'comparison endpoint shows correct improvement after        |
| endline added\')                                                |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'Center isolation --- security boundary\') {          |
|                                                                 |
| // This is the most critical security test group                |
|                                                                 |
| it(\'teacher A token cannot GET students from center B\')       |
|                                                                 |
| it(\'teacher A token cannot POST student to center B\')         |
|                                                                 |
| it(\'teacher A token cannot create attendance session for       |
| center B\')                                                     |
|                                                                 |
| it(\'teacher A token cannot enter exam scores for center B      |
| students\')                                                     |
|                                                                 |
| it(\'teacher A token cannot submit forms for center B           |
| students\')                                                     |
|                                                                 |
| it(\'teacher A token cannot see center B in their dashboard\')  |
|                                                                 |
| it(\'adding center B to teacher A\\\'s JWT manually does not    |
| bypass DB check\')                                              |
|                                                                 |
| // manually craft a token with extra centerId, verify DB layer  |
| still blocks                                                    |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'Concurrent operations\') {                           |
|                                                                 |
| it(\'two simultaneous score upserts for same student+subject do |
| not create duplicates\')                                        |
|                                                                 |
| it(\'two simultaneous session creates for same date return one  |
| 200 and one 409\')                                              |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'Soft delete consistency\') {                         |
|                                                                 |
| it(\'soft-deleted student does not appear in attendance session |
| auto-create\')                                                  |
|                                                                 |
| it(\'soft-deleted student does not appear in exam pending       |
| list\')                                                         |
|                                                                 |
| it(\'soft-deleted student does not appear in form pending       |
| list\')                                                         |
|                                                                 |
| it(\'soft-deleted user cannot authenticate\')                   |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'Input validation edge cases\') {                     |
|                                                                 |
| it(\'SQL injection attempt in search param is safely handled\') |
|                                                                 |
| it(\'extremely long string in fullName is rejected or truncated |
| gracefully\')                                                   |
|                                                                 |
| it(\'invalid UUID format in :id param returns 422 or 404, not   |
| 500\')                                                          |
|                                                                 |
| it(\'future date in dob is rejected\')                          |
|                                                                 |
| it(\'marks value of 999 for max_marks 50 is rejected\')         |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'Rate limiting\') {                                   |
|                                                                 |
| it(\'11th login attempt from same IP within 15 min returns      |
| 429\')                                                          |
|                                                                 |
| it(\'rate limit response has Retry-After header\')              |
|                                                                 |
| }                                                               |
|                                                                 |
| describe(\'Health check\') {                                    |
|                                                                 |
| it(\'GET /health returns 200 with db: connected when DB is      |
| accessible\')                                                   |
|                                                                 |
| it(\'response includes uptime as a positive number\')           |
|                                                                 |
| }                                                               |
+-----------------------------------------------------------------+

**Part 2: TypeScript Migration Prompt**

Run this after all tests pass. It converts any remaining .js files to
.ts and enforces strict typing across the whole codebase.

> *Do NOT run this prompt before the testing prompts. Fix all test
> failures in JS first. Once tests are green, then migrate to TypeScript
> --- it is much easier to debug type errors when the logic is already
> verified.*

+-----------------------------------------------------------------+
| **PROMPT TS-1**                                                 |
|                                                                 |
| **TypeScript Migration --- Full Codebase**                      |
|                                                                 |
| Convert .js files, add strict types, eliminate all \'any\'      |
+-----------------------------------------------------------------+

  --------------- --------------------------------------------------
  **File scope**  All files in backend/src/ and backend/tests/ ---
                  scan for .js files

  --------------- --------------------------------------------------

  --------------- --------------------------------------------------
  **Depends on**  All tests passing with green status

  --------------- --------------------------------------------------

**Prompt to paste into Cursor:**

+-----------------------------------------------------------------+
| Perform a full TypeScript migration and type-safety pass on the |
| SPARSHA backend.                                                |
|                                                                 |
| The backend is in backend/. Do NOT break any existing           |
| functionality.                                                  |
|                                                                 |
| All tests must still pass after this migration.                 |
|                                                                 |
| STEP 1 --- SCAN AND LIST:                                       |
|                                                                 |
| First, list every .js file found in backend/src/ and            |
| backend/tests/ and                                              |
|                                                                 |
| backend/prisma/. Print the list before making any changes.      |
|                                                                 |
| STEP 2 --- CONVERT .js TO .ts:                                  |
|                                                                 |
| For each .js file found:                                        |
|                                                                 |
| a\. Rename to .ts                                               |
|                                                                 |
| b\. Update all import statements that reference it (remove .js  |
| extension if present)                                           |
|                                                                 |
| c\. Do NOT change any logic --- only rename and fix imports at  |
| this step                                                       |
|                                                                 |
| STEP 3 --- SHARED TYPES FILE:                                   |
|                                                                 |
| Create backend/src/types/index.ts with these interfaces and     |
| types:                                                          |
|                                                                 |
| // JWT payload (what\'s in the token)                           |
|                                                                 |
| export interface JwtPayload {                                   |
|                                                                 |
| userId: string                                                  |
|                                                                 |
| email: string                                                   |
|                                                                 |
| role: UserRole                                                  |
|                                                                 |
| centerIds: string\[\]                                           |
|                                                                 |
| iat?: number                                                    |
|                                                                 |
| exp?: number                                                    |
|                                                                 |
| }                                                               |
|                                                                 |
| // Express Request extension                                    |
|                                                                 |
| declare global {                                                |
|                                                                 |
| namespace Express {                                             |
|                                                                 |
| interface Request {                                             |
|                                                                 |
| user: JwtPayload                                                |
|                                                                 |
| }                                                               |
|                                                                 |
| }                                                               |
|                                                                 |
| }                                                               |
|                                                                 |
| // API response wrappers                                        |
|                                                                 |
| export interface ApiSuccess\<T\> {                              |
|                                                                 |
| success: true                                                   |
|                                                                 |
| data: T                                                         |
|                                                                 |
| }                                                               |
|                                                                 |
| export interface ApiPaginated\<T\> {                            |
|                                                                 |
| success: true                                                   |
|                                                                 |
| data: T\[\]                                                     |
|                                                                 |
| meta: { total: number; page: number; totalPages: number }       |
|                                                                 |
| }                                                               |
|                                                                 |
| export interface ApiError {                                     |
|                                                                 |
| success: false                                                  |
|                                                                 |
| error: string                                                   |
|                                                                 |
| details?: unknown                                               |
|                                                                 |
| }                                                               |
|                                                                 |
| // UserRole must match Prisma enum exactly                      |
|                                                                 |
| export type UserRole = \'admin\' \| \'teacher\' \| \'staff\' \| |
| \'volunteer\' \| \'parent\' \| \'shareholder\'                  |
|                                                                 |
| // FormTemplate schema shape                                    |
|                                                                 |
| export interface FormFieldDefinition {                          |
|                                                                 |
| name: string                                                    |
|                                                                 |
| label: string                                                   |
|                                                                 |
| type: \'text\' \| \'textarea\' \| \'date\' \| \'number\' \|     |
| \'boolean\' \| \'select\'                                       |
|                                                                 |
| required: boolean                                               |
|                                                                 |
| options?: string\[\]                                            |
|                                                                 |
| }                                                               |
|                                                                 |
| export interface FormSchema {                                   |
|                                                                 |
| fields: FormFieldDefinition\[\]                                 |
|                                                                 |
| }                                                               |
|                                                                 |
| STEP 4 --- APPLY TYPES TO EVERY FILE:                           |
|                                                                 |
| Go through each src/ file and:                                  |
|                                                                 |
| a\. Replace all \'any\' types with proper types.                |
|                                                                 |
| Common replacements:                                            |
|                                                                 |
| \- req.user: use JwtPayload                                     |
|                                                                 |
| \- Prisma query results: use Prisma.StudentGetPayload\<\...\>   |
| or inferred return types                                        |
|                                                                 |
| \- Express handlers: use RequestHandler or typed                |
| Request/Response generics                                       |
|                                                                 |
| \- JSON body: use a typed Zod-inferred type (z.infer\<typeof    |
| schema\>)                                                       |
|                                                                 |
| b\. Add return types to all async functions:                    |
|                                                                 |
| \- Service functions: Promise\<ReturnType\>                     |
|                                                                 |
| \- Controller functions: Promise\<void\>                        |
|                                                                 |
| \- Middleware: void or NextFunction                             |
|                                                                 |
| c\. Type Zod schemas properly:                                  |
|                                                                 |
| Each Zod schema should export its inferred type:                |
|                                                                 |
| export const createStudentSchema = z.object({ \... })           |
|                                                                 |
| export type CreateStudentInput = z.infer\<typeof                |
| createStudentSchema\>                                           |
|                                                                 |
| STEP 5 --- TSCONFIG STRICTNESS:                                 |
|                                                                 |
| Update tsconfig.json to enable:                                 |
|                                                                 |
| strict: true                                                    |
|                                                                 |
| noImplicitAny: true                                             |
|                                                                 |
| strictNullChecks: true                                          |
|                                                                 |
| noUnusedLocals: true                                            |
|                                                                 |
| noUnusedParameters: true                                        |
|                                                                 |
| noImplicitReturns: true                                         |
|                                                                 |
| Then fix ALL TypeScript errors until \'npx tsc \--noEmit\'      |
| passes with zero errors.                                        |
|                                                                 |
| STEP 6 --- TYPE THE FACTORIES:                                  |
|                                                                 |
| In tests/helpers/factories.ts, type all factory function        |
| parameters and returns:                                         |
|                                                                 |
| createCenter(overrides?: Partial\<Prisma.CenterCreateInput\>):  |
| Promise\<Center\>                                               |
|                                                                 |
| createUser(overrides?: Partial\<\...\>): Promise\<User & {      |
| plainPassword: string }\>                                       |
|                                                                 |
| etc.                                                            |
|                                                                 |
| STEP 7 --- PRISMA CLIENT TYPES:                                 |
|                                                                 |
| Wherever Prisma include/select is used, use                     |
| Prisma.XxxGetPayload\<\...\> for the                            |
|                                                                 |
| return type. Example:                                           |
|                                                                 |
| type StudentWithRelations = Prisma.StudentGetPayload\<{         |
|                                                                 |
| include: { center: true; program: true }                        |
|                                                                 |
| }\>                                                             |
|                                                                 |
| STEP 8 --- FINAL CHECKS:                                        |
|                                                                 |
| a\. Run: npx tsc \--noEmit                                      |
|                                                                 |
| Fix all errors. Zero errors required.                           |
|                                                                 |
| b\. Run: npm test                                               |
|                                                                 |
| All tests must still pass. Fix any test failures caused by the  |
| migration.                                                      |
|                                                                 |
| c\. Run: npm run build                                          |
|                                                                 |
| Compiled JS output must exist in dist/.                         |
|                                                                 |
| DO NOT:                                                         |
|                                                                 |
| \- Change any business logic                                    |
|                                                                 |
| \- Change any API response shapes                               |
|                                                                 |
| \- Add new endpoints                                            |
|                                                                 |
| \- Modify the Prisma schema                                     |
|                                                                 |
| \- Use \@ts-ignore or \@ts-expect-error as a shortcut           |
|                                                                 |
| \- Leave any \'any\' types in production code (test helpers may |
| use them sparingly)                                             |
+-----------------------------------------------------------------+

**Appendix: Test Commands Reference**

+-----------------------------------------------------------------+
| \# Run all tests (required: \--runInBand for serial execution)  |
|                                                                 |
| npm test                                                        |
|                                                                 |
| \# Run a single test file                                       |
|                                                                 |
| npx jest tests/auth.test.ts \--runInBand                        |
|                                                                 |
| \# Run tests matching a name pattern                            |
|                                                                 |
| npx jest \--testNamePattern=\'center isolation\' \--runInBand   |
|                                                                 |
| \# Run with coverage report                                     |
|                                                                 |
| npm run test:coverage                                           |
|                                                                 |
| \# Watch mode during development                                |
|                                                                 |
| npm run test:watch                                              |
|                                                                 |
| \# TypeScript compile check (no output)                         |
|                                                                 |
| npx tsc \--noEmit                                               |
|                                                                 |
| \# Build for production                                         |
|                                                                 |
| npm run build                                                   |
|                                                                 |
| \# Seed the TEST database specifically                          |
|                                                                 |
| NODE_ENV=test npx prisma db seed                                |
|                                                                 |
| \# Reset test DB and re-apply migrations                        |
|                                                                 |
| NODE_ENV=test npx prisma migrate reset \--force                 |
+-----------------------------------------------------------------+

**Appendix: Recommended Test Run Order**

+-----------------------------------------------------------------+
| \# Correct order to run all Cursor prompts from this document:  |
|                                                                 |
| 1\. T-0 Test infrastructure (MUST be first)                     |
|                                                                 |
| 2\. T-1 Auth tests                                              |
|                                                                 |
| 3\. T-2 Student tests                                           |
|                                                                 |
| 4\. T-3 Attendance tests                                        |
|                                                                 |
| 5\. T-4 Exam tests                                              |
|                                                                 |
| 6\. T-5 Forms tests                                             |
|                                                                 |
| 7\. T-6 Centers & Programs tests                                |
|                                                                 |
| 8\. T-7 User management tests                                   |
|                                                                 |
| 9\. T-8 Activities tests                                        |
|                                                                 |
| 10\. T-9 Reports tests                                          |
|                                                                 |
| 11\. T-10 Integration + edge case tests (MUST be last among     |
| tests)                                                          |
|                                                                 |
| \-\-- All tests green? \-\--                                    |
|                                                                 |
| 12\. TS-1 TypeScript migration                                  |
|                                                                 |
| \-\-- npx tsc \--noEmit passes with 0 errors? \-\--             |
|                                                                 |
| \-\-- npm test still passes? \-\--                              |
|                                                                 |
| Backend is production ready.                                    |
+-----------------------------------------------------------------+

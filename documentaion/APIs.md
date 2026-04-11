# SPARSHA API notes (`/api`)

**Note:** This file is descriptive; route behavior can differ slightly by module (some endpoints return raw JSON, others wrap `{ success, data }`). Verify against `backend/src/app.ts` and route handlers. **Current overview:** `documentaion/STATUS.md`.

Base URL: **`/api`** (served by the Express app; default origin `http://localhost:5000` in development).

Format: JSON. Not every handler uses the same envelope — check the controller for each area.

## Global Response Structure
* **Success:** `{ "success": true, "message"?: "...", "data"?: { ... } }`
* **Error:** `{ "success": false, "message": "Error description" }`

**Authorization:**
Protected routes expect an `Authorization` header formatted as: `Bearer <accessToken>`
The `refreshToken` is handled automatically via HttpOnly cookies.

---

## Dashboard pending (`/api/dashboard`)

### `GET /pending` (Protected)
Returns numeric counts for alerts:
```json
{
  "missingAttendance": 0,
  "incompleteExams": 0,
  "pendingForms": 0
}
```
Attendance counts incomplete **attendance sessions** in the **last 7 days** (expected records vs enrolled students). Exam and form counts follow the same heuristics as `GET /api/reports/pending` detail lists.

---

## 1. Authentication APIs (`/api/auth`)

### `POST /register`
* **Purpose:** Create a new user account.
* **Body:**
  ```json
  {
    "phone": "string", // Required
    "password": "string", // Required, Min 8 characters
    "email": "string" // Optional
  }
  ```
* **Returns:** `201 Created`
  ```json
  { "success": true, "message": "Registration successful", "data": { "user": { "id": 1, "phone": "...", "email": "..." }, "accessToken": "jwt-string" } }
  ```
  *(Also sets `refreshToken` inside HttpOnly cookie)*

### `POST /login`
* **Purpose:** Authenticate an existing user.
* **Body:**
  ```json
  {
    "identifier": "string", // Required (can be phone or email)
    "password": "string" // Required
  }
  ```
* **Returns:** `200 OK` (Same payload as `/register`)

### `POST /refresh`
* **Purpose:** Issue a new accessToken using the HttpOnly `refreshToken` cookie.
* **Body:** None
* **Returns:** `200 OK`
  ```json
  { "success": true, "message": "Token refreshed", "data": { "accessToken": "new-jwt-string", "user": { ... } } }
  ```

### `POST /logout`
* **Purpose:** Clear the HttpOnly `refreshToken` cookie.
* **Returns:** `200 OK` `{ "success": true, "message": "Logged out successfully" }`

### `GET /me` (Protected)
* **Purpose:** Fetch the authenticated user's details.
* **Returns:** `200 OK` `{ "success": true, "data": { "user": { ... } } }`

### `PUT /change-password` (Protected)
* **Purpose:** Change password.
* **Body:**
  ```json
  {
    "currentPassword": "str", 
    "newPassword": "str" // Min 8 chars
  }
  ```

---

## 2. Student Management APIs (`/api/students`)
*All endpoints below require standard Bearer token authorization.*

### `GET /dashboard`
* **Purpose:** Retrieve system-wide statistics for the admin dashboard.
* **Query:** None
* **Returns:** 
  ```json
  {
    "success": true, 
    "data": {
       "totalStudents": 150,
       "totalSessions": 300,
       "attendanceRate": "85.5%",
       "avgSkills": { "communication": 3.4, "confidence": 4.1, "computerSkill": 2.8, "problemSolving": 3.9, "languageSkill": 3.0 }
    }
  }
  ```

### `GET /`
* **Purpose:** List students with pagination and search.
* **Query Params:**
  * `page` (default 1)
  * `limit` (default 20)
  * `search` (optional string, filters across name, schoolName, location, phone)
* **Returns:**
  ```json
  {
    "success": true,
    "data": {
      "students": [ { "id": 1, "name": "...", "_count": { "attendance": 5, "skills": 1, "careers": 0 } } ],
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
  ```

### `POST /`
* **Purpose:** Create a new student.
* **Body:**
  ```json
  {
    "name": "string",
    "age": 15,
    "gender": "Male | Female | Other",
    "class": "10th",
    "schoolName": "string",
    "parentName": "string",
    "phone": "string",
    "location": "string"
  }
  ```
* **Returns:** `201 Created` `{ "success": true, "data": { studentObject } }`

### `GET /:id`
* **Returns:** Complete student record including nested arrays for `attendance`, `skills`, and `careers`.

### `GET /:id/profile`
* **Purpose:** Single aggregated payload for the student detail UI (charts, submissions table, linked parents).
* **Returns:** Flat JSON (not wrapped in `{ success, data }`) with:
  * `student` — Prisma student with `center`, `program` (no raw attendance/exam rows on this object).
  * `stats` — `{ attendancePct, avgExamPct, skillScore }` (`skillScore` may be `null` until wired).
  * `attendanceTrend` — up to 10 points: `{ date, present }` where `present` is `1` or `0`.
  * `examComparison` — per subject: `{ subject, baseline, endline }` percentages when scores exist.
  * `skillRadar` — optional `{ skill, score }[]` (often empty; UI may fall back to `GET /:id/skills`).
  * `formSubmissions` — recent rows with `template` metadata.
  * `parents` — `ParentStudent` rows with linked `parent` user.

### `PUT /:id`
* **Body:** Any field from the Student model. Partial updates permitted.

### `DELETE /:id`
* **Returns:** `{ "success": true, "message": "Student deleted successfully" }`

---

## 3. Sub-Entities (Attendance, Skills, Careers)

### Attendance
* `POST /:studentId/attendance`
  * **Body:** `{ "date": "2023-10-01T00:00:00Z", "sessionTopic": "string", "status": "string" }`
* `GET /:studentId/attendance` (Returns array ordered by date descending)
* `PUT /attendance/:id`

### Skills
* `POST /:studentId/skills`
  * **Body:** `{ "communication": 5, "confidence": 4, "computerSkill": 2, "problemSolving": 3, "languageSkill": 4 }` (Ints usually 1-5 scale)
* `GET /:studentId/skills` (Returns array ordered by creation date desc)
* `PUT /skills/:id`

### Careers
* `POST /:studentId/careers`
  * **Body:** `{ "interestedCareer": "string", "courseSelected": "string", "collegeApplied": "string", "scholarship": true/false, "followupStatus": "string" }`
* `GET /:studentId/careers` 
* `PUT /careers/:id`

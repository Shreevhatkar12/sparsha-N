# Next Planned Immediate Steps

This document outlines the immediate tasks and improvements that developers need to focus on next.

## Backend Actions
1. **Fix Prisma DB Synchronization (Crucial):** Run standard Prisma setup over the `database.md` layout. It is highly recommended to actually port the schema block from `database.md` to `backend/prisma/schema.prisma` if not already done, and run migrations (`npx prisma migrate dev`).
2. **Environment Variable Configurations:** Copy `.env.example` to `.env` and fill in necessary secrets (Database URLs, JWT Secret keys).
3. **Data Validation:** Implement input validation mechanisms (e.g. `Joi` or `Zod`) inside routes before it reaches controllers to protect the database from bad data. 
4. **Pagination Consistency:** Pagination has only been strictly implemented on `getAllStudents`. It should be evaluated for other collection returns like Attendance or Skills if records grow large.
5. **Testing Preparation:** Setup Jest/Supertest configuration scripts so unit API tests can begin on Authentication routes.

## Frontend Development Requirements

### 1. Initialization Core
* **Framework:** Initialize a strict, modern application (preferably Vite + React or Next.js App Router) cleanly inside a `frontend/` directory.
* **Type Safety & Styling:** Implement TypeScript to bind tightly with backend API expectations, and configure your preferred CSS system (e.g. TailwindCSS) aligning to modern aesthetic standards with smooth micro-animations.

### 2. State & Security Setup
* **JWT Token State:** The backend operates on a dual-token system. The `accessToken` must be stored **in-memory** only (such as Zustand, Redux, or a React Context). Do not dump the `accessToken` into `localStorage` (XSS protection).
* **Automatic Auth Refresh:** The backend assigns an HttpOnly `refreshToken` cookie. This means you do not handle the refresh token manually. Instead, you must build an Axios interceptor:

  1. Enable `withCredentials: true` globally via Axios so the HttpCookie is sent on every request.
  2. **Request Interceptor:** Dynamically inject `Authorization: Bearer <accessToken>` into the headers for all protected routes (anything under `/api/students/` or `/api/auth/me`).
  3. **Response Interceptor:** If a request fails with a `401 Unauthorized` (indicating the `accessToken` expired):
     - Pause incoming outbound requests.
     - Automatically trigger a call to `POST /api/auth/refresh`. 
     - Once the new `accessToken` is verified, update the in-memory state, patch the paused requests, and retry them seamlessly without booting the user to the login screen.

### 3. Required Pages & UI Flow
* **Authentication Screens:** 
  - Login form requires a single `identifier` input (label it "Phone or Email") and `password`.
  - Registration requires `phone` (mandatory), `email` (optional), and `password` setup.
* **Analytics Dashboard:**
  - Call `GET /api/students/dashboard`.
  - Build visualization components (Line/Bar charts) rendering `avgSkills`, attendance rates, and top-level capacity metrics.
* **Student Roster (Datatable):**
  - Implement a paginated Data Table. 
  - Call `GET /api/students` and hook up an active search bar that automatically passes the `search` query parameter dynamically. 
* **Dynamic Record Profiles (Tabs Level):**
  - Inside a Single Student view (`/students/:id`), design 4 tabs: **Profile Info**, **Attendance**, **Skills Summary**, and **Career Paths**. 
  - These map directly to `POST /api/students/:studentId/attendance`, `/skills`, etc.

### 4. Direct Frontend Validations
Replicate the expected Prisma API constraints on the client-side (using Zod or Yup) before submitting:
- Passwords absolutely require an 8-character minimum.
- Age, Skill Integers (1-5 scales normally for communication/logic arrays) must be strictly cast as `Numbers`, not Strings.
- Booleans (`scholarship` field) require checkbox bindings.

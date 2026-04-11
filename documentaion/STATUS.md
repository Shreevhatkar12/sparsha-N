# SPARSHA — implementation status and progress report

**Last updated:** April 2026 (aligned with repo state: `SPARSHA_Cursor_Prompt.md` phases and codebase).

This document is the single place for **what ships today**, **what is partial**, and **what remains**. For exact HTTP shapes, cross-check `backend/src/app.ts` and route files; `APIs.md` may lag minor details.

---

## Executive summary

The stack is **usable end-to-end** for demo and pilot: auth, students, attendance, exams (including bulk entry), dynamic forms, reports, dashboard pending counts, and a branded UI. Gaps are mainly **hardening** (tests, stricter typing, token storage strategy), **data-model alignment** in a few legacy JS services, and **product polish** (loading states, exports).

---

## Phase checklist (from `SPARSHA_Cursor_Prompt.md`)

| Phase | Topic | Status |
|-------|--------|--------|
| 1–4 | Analysis, API layer, backend routes, frontend integration, shared UI | **Delivered** |
| 5 | Dynamic forms (builder, renderer, submissions) | **Delivered** |
| 6 | Student detail (`/api/students/:id/profile`, charts, submissions table) | **Delivered** |
| 7 | UI/UX (brand colors, fonts, layout) | **Delivered** |
| 8 | Center-wise access (JWT `centerIds`, active assignments) | **Delivered** (middleware file exists; services enforce scope) |
| 9 | Exam bulk entry + `ExamScore` uniqueness | **Delivered** |
| 10 | Multi-form types + seed templates | **Delivered** (`student_meeting`, `parent_meeting`, `activity_form` in seed) |
| 11 | Pending tasks API + dashboard + sidebar badges | **Delivered** |

---

## Backend — implemented

- **Express app** mounting `/api/*` (`auth`, `students`, `attendance`, `exams`, `forms`, `centers`, `programs`, `users`, `activities`, `reports`, **`dashboard`**).
- **Prisma** schema: centers, programs, students, attendance sessions/records, exams/scores (with **unique** `(examId, studentId, subject)`), form templates/submissions, users and center assignments.
- **JWT:** `buildJwtPayload` loads **`centerIds` only for assignments with `validUntil: null`**.
- **Student profile aggregation:** `GET /api/students/:id/profile`.
- **Exams:** `POST /api/exams/:examId/scores` bulk upsert using Prisma `upsert` on compound unique.
- **Reports:** dashboard summary, attendance/skills/exams analytics, filtered students, pending detail lists, CSV export (role-gated).
- **Alerts:** `GET /api/dashboard/pending` → `{ missingAttendance, incompleteExams, pendingForms }` (attendance slice uses incomplete sessions in the **last 7 days** per `reportService`).

## Backend — partial / risks

- **Mixed JS/TS:** Some controllers/services are `.js`; keep behavior consistent when refactoring.
- **`student.service.js` (legacy):** References older patterns in places; verify against `schema.prisma` before relying on every sub-route in production.
- **`attachAllowedCenters`:** Present under `middleware/centerAccess.ts`; not necessarily wired on every router — enforcement is primarily **service-level + JWT**.
- **Tests:** No Jest/Supertest suite in `package.json`.

---

## Frontend — implemented

- **Routing:** Login, dashboard, students (list, new, detail, edit), attendance, skills, careers, exams, forms (list, builder, fill, submissions), reports, settings.
- **API layer:** `src/services/*.ts` + Axios instance (`withCredentials`, Bearer from `localStorage`).
- **Auth store:** Zustand + `selectedCenterId` for scoped UI where used.
- **Student detail:** Charts (Recharts), form submissions table, optional skills/careers when APIs respond.
- **Exams:** Filter by center/program/type/year/date; prepare or load exam; grid for English/Science/Maths + remarks; save bulk scores.
- **Forms:** Field editor with reorder, preview, form-type filter on list.
- **Dashboard / sidebar:** Pending counts from `GET /api/dashboard/pending`.
- **Styling:** Tailwind v4 `@theme` brand palette, Sora + DM Sans, main column **max-width 1280px**.

## Frontend — partial / gaps

- **Token storage:** Access token in **`localStorage`**; prompt originally suggested memory-only for XSS — would need coordinated refresh interceptor + backend cookie contract.
- **Types:** Many responses typed loosely as `Record<string, unknown>`; could be tightened to match backend DTOs.
- **TanStack Query:** Dependency present; not uniformly used (many `useEffect` + `useState` loads).

---

## Operations: commands reference

**Backend** (from `backend/`):

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma db seed          # optional
npm run dev
```

**Frontend** (from `frontend/`):

```bash
npm install
cp .env.example .env        # optional in dev
npm run dev
```

**Health:** `GET http://localhost:5000/health`  
**App:** `http://localhost:5173` (Vite default)

---

## Suggested next work (product + engineering)

1. Add **API integration tests** for auth and one vertical slice (e.g. students).
2. Align **all** student-related services with current Prisma models; remove dead code paths.
3. **Harden auth:** refresh queue, consider memory-only access token + documented cookie refresh.
4. **Observability:** structured logging, request IDs, production error reporting.
5. **PWA:** Revisit `vite-plugin-pwa` when peer constraints allow, or keep manual SW and document limitations.

---

## Related files

- `README.md` (repo root) — quick start
- `backend/README.md`, `frontend/README.md` — package-specific
- `SPARSHA_Cursor_Prompt.md` — original phased spec

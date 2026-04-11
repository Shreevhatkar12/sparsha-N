# Backend — architecture notes (SPARSHA)

**Stack:** Node.js, Express 5, Prisma 7, PostgreSQL, Zod validation on selected routes, JWT auth.

**Entry:** `src/server.ts` loads `src/app.ts`, which registers routes under `/api`.

## Request flow

1. **CORS / JSON / security** middleware on the app.
2. **Route modules** (`src/routes/*.ts` and `*.js`) map paths to controllers.
3. **Controllers** parse `req`, call **services** (`src/services/`).
4. **Prisma** access is centralized per module; some services use a dedicated Prisma client instance pattern — follow existing files when adding code.
5. **Errors** go through `middleware/errorHandler.ts`.

## Auth and centers

- JWT payload includes **`userId`**, **`email`**, **`role`**, **`centerIds`**.
- **`centerIds`** are built from `UserCenterAssignment` rows where **`validUntil` is `null`** (`src/lib/auth.ts`).
- **Non-admins** are restricted with helpers such as **`centerScope`** in `src/lib/centerScope.ts` (and similar patterns in TS services) so queries filter by allowed centers.
- Optional middleware **`attachAllowedCenters`** (`src/middleware/centerAccess.ts`) can attach `allowedCenterIds`; route handlers still rely on services for enforcement.

## Main API groups

| Prefix | Notes |
|--------|--------|
| `/api/auth` | Login, register, refresh, logout, me |
| `/api/students` | CRUD, nested attendance/skills/careers routes (mixed legacy JS), **`/:id/profile`** |
| `/api/attendance` | Sessions and student attendance |
| `/api/exams` | CRUD, scores, comparison, **`/:examId/scores`** |
| `/api/forms` | Templates and submissions |
| `/api/centers`, `/api/programs` | Directory data |
| `/api/users`, `/api/activities` | Users and activities |
| `/api/reports` | Dashboard, analytics, pending lists, export |
| `/api/dashboard` | **`GET /pending`** — compact pending counts for UI |

## Database

- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/`
- **Seed:** `prisma/seed.ts` — run with `npx prisma db seed`

## Environment

See **`backend/.env.example`**. Required: **`DATABASE_URL`**, **`JWT_ACCESS_SECRET`**, **`JWT_REFRESH_SECRET`**. **`CLIENT_URL`** should match the frontend origin (e.g. `http://localhost:5173` in dev).

## Run commands

Documented in **`backend/README.md`** (`npm install`, `npx prisma generate`, migrate, `npm run dev`).

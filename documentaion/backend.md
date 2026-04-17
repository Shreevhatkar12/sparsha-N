# Backend — architecture notes (SPARSHA)

SPARSHA is a comprehensive **Organization Management System (OMS)**. While it provides deep student tracking (SMS), it is architected as a center-based resource and activity management platform.

**Stack:** Node.js, Express 5, Prisma 7, PostgreSQL, Zod validation on selected routes, JWT auth.

**Entry:** `src/server.ts` loads `src/app.ts`, which registers routes under `/api`.

## Request flow

1. **CORS / JSON / security** middleware on the app.
2. **Route modules** (`src/routes/*.ts` and `*.js`) map paths to controllers.
3. **Controllers** parse `req`, call **services** (`src/services/`).
4. **Prisma** access is centralized per module; some services use a dedicated Prisma client instance pattern — follow existing files when adding code.
5. **Errors** go through `middleware/errorHandler.ts`.

## Auth and RBAC Enforcement

The system uses a **multi-layered enforcement stack** for every request:

1.  **Authentication**: `authenticate` middleware verifies the JWT. Payload includes `userId`, `role`, and `centerIds`.
2.  **Role Authorization**: `requireRole` middleware checks if the user's role is in the allowed list for the route (as defined in `sparsha_rbac.md`).
3.  **Center Access**: `centerAccess` middleware ensures non-admins are restricted to their assigned centers.
    - `super_admin` & `tech_admin`: Bypass center filters (full visibility or system access).
    - `center_admin` & others: strictly filtered by `user_center_assignments`.
4.  **Operational Scope**:
    - `volunteer`: Further restricted via `user_activity_assignments` (checked against `valid_from/until`).
    - `student/parent`: Scoped to own/child data via `parent_student` or direct ownership.
5.  **PII Protection**: Aggregated roles like `shareholder` and system roles like `tech_admin` are restricted at the service layer from seeing personal identifiable information (PII).

## Main API groups

| Prefix | Notes |
|--------|--------|
| `/api/auth` | Login, register, refresh, logout, me |
| `/api/students` | CRUD, nested attendance/skills/careers routes, **`/:id/profile`** |
| `/api/attendance` | Sessions and student attendance |
| `/api/exams` | CRUD, scores, comparison |
| `/api/forms` | Templates and submissions |
| `/api/activities` | Event management, **vaccine camps**, distribution tracking |
| `/api/equipment` | Inventory tracking and logs |
| `/api/messages` | Internal threaded communications |
| `/api/announcements`| Role-based broadcasts |
| `/api/centers`, `/api/programs` | Core meta-data |
| `/api/users` | User management and assignments |
| `/api/reports`, `/api/dashboard` | Analytics and pending task heuristics |

## Database

- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/`
- **Seed:** `prisma/seed.ts` — run with `npx prisma db seed`
  > **Note**: Your database user must have `CREATEDB` permissions to allow Prisma to manage its shadow database for migrations. Example: `sudo -u postgres psql -c "ALTER ROLE username CREATEDB;"`

## Architecture & Adapters

As of Prisma 7, the project utilizes the `@prisma/adapter-pg` driver adapter. Database connections are handled using connection pooling (`pg.Pool`) instantiated in `src/lib/prisma.ts`. 

- **Do NOT instantiate local `PrismaClient` instances** in service files.
- **Always import `prisma`** from `src/lib/prisma.js` to avoid connection limits and constructor errors.

## Environment

See **`backend/.env.example`**. Required: **`DATABASE_URL`**, **`JWT_ACCESS_SECRET`**, **`JWT_REFRESH_SECRET`**. 
**`CLIENT_URL`** must match the frontend origin exactly (e.g., `http://localhost:5173`) and is **required for CORS** to successfully authorize and prevent the browser from blocking requests.

## Run commands

Documented in **`README.md`** (`npm install`, grant DB permissions, `npx prisma generate`, migrate, `npm run dev`).

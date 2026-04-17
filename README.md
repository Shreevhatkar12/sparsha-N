# SPARSHA (kittykat)

Student administration stack for SPARSHA NGO: **React + Vite** frontend and **Express + Prisma + PostgreSQL** backend. This repo is a monorepo with two deployable parts: `frontend/` and `backend/`.

---

## End-to-end: run the project locally

Do these steps **in order** on a machine with Node.js 20+ and a running PostgreSQL instance (or cloud URL).

### 1. Clone and open the repo

```bash
cd kittykat
```

### 2. Backend Setup

First, ensure your PostgreSQL user has the necessary permissions to create databases (required by Prisma for its shadow database during migrations). Run this command in your terminal, replacing `kittykat` with your actual database user if different:

```bash
sudo -u postgres psql -c "ALTER ROLE kittykat CREATEDB;"
```

Then, set up the backend:

```bash
cd backend
npm install
cp .env.example .env
```

Edit **`backend/.env`**: set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` to real values. Set `CLIENT_URL=http://localhost:5173` to allow the frontend to authenticate with the backend without CORS errors.

```bash
npx prisma generate
npx prisma migrate deploy
```

For a **new** local database during development you may use:

```bash
npx prisma migrate dev
```

Optional demo data:

```bash
npx prisma db seed
```

Start the API:

```bash
npm run dev
```

Confirm **`http://localhost:5000/health`** returns JSON with `"status": "ok"`.

### 3. Frontend Setup

Open a **second terminal**:

```bash
cd frontend
npm install --legacy-peer-deps
npm install react-is --legacy-peer-deps
cp .env.example .env
```

> **Note**: Due to the bleeding-edge use of Vite 8 mixed with PWA and Recharts plugins, the `--legacy-peer-deps` flag and explicit `react-is` installation are **mandatory** to resolve dependency conflicts.

Leave `VITE_API_URL` commented for local dev (Vite proxies `/api` to port 5000 — see `frontend/vite.config.ts`).

```bash
npm run dev
```

Open **`http://localhost:5173`**. Log in with a user from your database (seed creates users such as `admin@sparsha.org` / `Admin@123` if you ran the seed — change passwords in production).

### 4. Production-style frontend build (optional)

```bash
cd frontend
# Set VITE_API_URL in .env to your public API base, e.g. https://api.example.com/api
npm run build
npm run preview
```

---

## Implemented vs not (summary)

| Area | Implemented | Not / partial |
|------|-------------|-----------------|
| Auth | JWT login, protected routes, `/api/auth` | Memory-only tokens, full refresh-queue interceptor (see frontend README) |
| Students | List, CRUD, **`GET /api/students/:id/profile`**, detail UI with charts | Some legacy student sub-routes in JS may not match current Prisma schema |
| Attendance | Session + record APIs, UI | Pagination polish everywhere |
| Exams | Exams CRUD, bulk scores, **`ExamScore` unique** constraint, bulk grid UI | — |
| Forms | Templates, builder, renderer, submissions, form-type filter, seeds | — |
| Reports & dashboard | `/api/reports/*`, **`/api/dashboard/pending`**, dashboard + sidebar badges | Heuristic pending counts; tune business rules as needed |
| UI | Brand theme, Sora/DM Sans, layout width 1280px | Full design-system audit |

Details: **`documentaion/STATUS.md`**.

---

## Documentation

| File | Contents |
|------|----------|
| `documentaion/STATUS.md` | Progress report and module checklist |
| `documentaion/APIs.md` | API notes (verify against live routes) |
| `documentaion/frontend.md` | Frontend architecture notes |
| `documentaion/backend.md` | Backend architecture notes |
| `documentaion/MEETING_DEMO_GUIDE.md` | Presentation-ready workflow, test cases, backup/import/export steps |
| `SPARSHA_Cursor_Prompt.md` | Original phased specification |

---

## Repository layout

```
backend/     Express API, Prisma, migrations, seed
frontend/    Vite + React app
documentaion/  Extra docs (folder name as in repo)
```

---

## Docker runbook (stable)

Use these commands from project root:

```bash
docker compose build
docker compose up -d
docker compose logs -f backend frontend db
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Postgres (host): `localhost:5433`

### If build fails at npm ci with "Exit handler never called"

This is usually Docker DNS/network on the machine, not a project code error.

Permanent fix (Linux with systemd):

```bash
chmod +x scripts/fix-docker-dns.sh
./scripts/fix-docker-dns.sh
```

Then rebuild:

```bash
docker compose build --no-cache
docker compose up -d
```

### Windows boss machine

Install Docker Desktop first, then in project folder run:

```powershell
docker compose build
docker compose up -d
```

---

## License

See `package.json` files in each package. SPARSHA NGO internal use unless stated otherwise.

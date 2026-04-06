# Sparsha NGO Project

Monorepo for Sparsha NGO operations platform.

## Repository Contents

- `backend/`: Express + Prisma API for auth, students, attendance, exams, forms, centers, users, and reports.
- `frontend/`: React + TypeScript + Vite PWA web app for Android and desktop usage.
- `documentaion/`: working docs, planning notes, and API/database references.

## How to Run

### Backend

```bash
cd backend
npm install
npm run dev
```

Default API URL: `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend dev URL is provided by Vite (usually `http://localhost:5173`).

## Notes

- Frontend auth stores `accessToken` only in memory.
- Frontend API base URL is configured via `VITE_API_BASE_URL`.
- For backend + Prisma 7, Node.js `22.x` is recommended.
- Documentation is still evolving; code is the current source of truth.

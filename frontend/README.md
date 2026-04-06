# Sparsha Frontend

React + TypeScript + Vite PWA frontend for Sparsha NGO.

## Overview

This frontend now includes:

- PWA base (`manifest.webmanifest`, `sw.js`, service worker registration).
- Auth integration foundation with in-memory access token handling.
- Axios API client with:
  - `withCredentials: true`
  - bearer token injection
  - automatic 401 refresh handling with request queue retry
- Route architecture:
  - public routes: `/login`, `/register`
  - protected routes: `/`, `/students`
- Initial backend-connected pages:
  - Dashboard (`GET /api/students/dashboard`)
  - Students list with search (`GET /api/students`)

## Project Structure

- `src/api/`: typed API modules (`authApi`, `studentsApi`)
- `src/lib/`: API client and token store
- `src/features/auth/`: auth provider and form validators
- `src/app/`: routing and app shell
- `src/pages/`: page-level UI
- `public/`: PWA manifest and service worker

## Environment

Create `.env` in `frontend/`:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Next Expansion Areas

- Student profile tabs (Profile, Attendance, Skills, Career Paths)
- Change password and role-based access behaviors
- Stronger typed DTOs as backend contracts stabilize

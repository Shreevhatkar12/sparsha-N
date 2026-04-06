# Frontend Plan and Current Status (Sparsha NGO)

## What is implemented now

- `frontend/` initialized with React + TypeScript + Vite.
- Corporate-style responsive UI shell is in place and usable on desktop and Android browsers.
- PWA baseline is active:
  - `frontend/public/manifest.webmanifest`
  - `frontend/public/sw.js`
  - service worker registration in `frontend/src/main.tsx`
- Actual integration foundation added:
  - Auth provider with in-memory access token state.
  - Axios interceptor pipeline with automatic token refresh and request queue.
  - Public routes (`/login`, `/register`) and protected routes (`/`, `/students`).
  - Dashboard + students list connected to backend APIs.
- Frontend README updated with run/build instructions.

## Testing Intro (Dummy Auth Data)

Use these values for first local auth testing:

- Register request shape:
  - `phone` (required)
  - `email` (optional but recommended for login in current backend)
  - `password` (minimum 8 chars)
- Login request shape in current backend:
  - `identifier` field in UI is sent as backend `email`
  - `password`

Suggested dummy data:

- Register:
  - `phone`: `9999999999`
  - `email`: `dev1@sparsha.local`
  - `password`: `Test@1234`
- Login:
  - `identifier`: `dev1@sparsha.local`
  - `password`: `Test@1234`

Note: current backend login is email-based. Phone-only login can be enabled later without changing frontend form UX.

## New Developer First Run (Local PWA)

1. Start backend first:
   - `cd backend`
   - `npm install`
   - `cp .env.example .env`
   - fill required values (`DATABASE_URL`, `JWT_SECRET`, `PORT`)
   - `npm run dev`
2. Start frontend:
   - `cd frontend`
   - `npm install`
   - `cp .env.example .env`
   - keep `VITE_API_BASE_URL=http://localhost:5000`
   - `npm run dev`
3. Open the Vite URL in browser (usually `http://localhost:5173`).
4. Register with dummy values above, then login.
5. Optional PWA install test:
   - open in Android Chrome or desktop Chrome
   - use browser "Install app" action
   - confirm standalone launch works.

## UX direction

- Design language: clean, enterprise, trust-focused.
- Color profile: teal accent + neutral surfaces to align with NGO professionalism.
- Layout behavior:
  - desktop: multi-column dashboard layout.
  - mobile: stacked cards and touch-friendly spacing.

## Pending frontend work (critical)

1. Student detail workflows
   - Student profile screen with tabs:
     - Profile Info
     - Attendance
     - Skills Summary
     - Career Paths
2. Stronger domain typing
   - Replace permissive frontend response types with finalized backend DTO contracts
3. Auth hardening follow-ups
   - Add change-password UX
   - Add refresh-token cookie alignment when backend refresh-cookie flow is finalized
4. Form validation expansion
   - Numeric validation for age and skills
   - Boolean binding for scholarship

## Important note

`vite-plugin-pwa` currently conflicts with Vite 8 peer requirements, so PWA support is implemented via manual manifest + service worker for now.

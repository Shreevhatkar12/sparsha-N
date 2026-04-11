# Frontend — architecture notes (SPARSHA)

**Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Zustand, Axios, Recharts, React Hook Form (forms module).

## HTTP client

- **`src/services/api.ts`:** `baseURL` = `import.meta.env.VITE_API_URL` or **`/api`**.
- **Development:** Vite **`server.proxy`** forwards `/api` → `http://localhost:5000` (`vite.config.ts`), so the browser can use relative `/api` without CORS issues.
- **Production build:** set **`VITE_API_URL`** to the full API base (including `/api` if the backend is mounted there).
- **Credentials:** `withCredentials: true` for cookies where the backend sets them.
- **Auth header:** `Authorization: Bearer <token>` from `localStorage` key `token` (project convention).

## Routing and layout

- **`App.tsx`:** Public `/login`; protected routes under **`ProtectedRoute`** (sidebar + top bar + `<Outlet />`).
- **Auth gate:** Redirects to `/login` if no access token; optional bootstraps session from `/api/auth/me` when only `localStorage` has a token.

## State

- **`useAuthStore`:** `currentUser` (includes **`centerIds`**), `accessToken`, **`selectedCenterId`** (defaults to first center for staff).

## Feature areas

| Area | Paths / notes |
|------|----------------|
| Dashboard | `/dashboard` — stats + **pending tasks** card (`/api/dashboard/pending`) |
| Students | `/students`, `/students/new`, `/students/:id`, `/students/:id/edit` — detail uses **`/api/students/:id/profile`** |
| Attendance | `/attendance` |
| Skills / Careers | `/skills`, `/careers` |
| Exams | `/exams` — bulk grid + **`POST /api/exams/:examId/scores`** |
| Forms | `/forms`, `/forms/new`, `/forms/:templateId/edit`, `/forms/:templateId/fill`, `/forms/:templateId/submissions` |
| Reports / Settings | `/reports`, `/settings` (admin-gated where applicable) |

## UI system

- **Brand:** CSS variables `brand-50` … `brand-900` in `src/index.css`; primary actions use **brand-700/600**.
- **Typography:** **Sora** for headings, **DM Sans** for body (loaded in `index.html`).
- **Layout:** **`PageWrapper`** uses max width **1280px** and horizontal padding.

## PWA

- Manual **`manifest.webmanifest`** and **`sw.js`**; service worker registration in bootstrap. Full `vite-plugin-pwa` is optional and not required for core flows.

## Gaps

- Tighter TypeScript types for API responses.
- Optional migration to TanStack Query for caching and loading/error consistency.
- Token storage strategy vs XSS (currently `localStorage`).

## Install & Dependency Conflicts

- Due to the usage of the brand-new Vite 8 and Tailwind V4 stack, some plugins (like `vite-plugin-pwa` and `recharts`) have strict peer dependency conflicts with Vite 8. 
- You **MUST** run installation commands with `--legacy-peer-deps`.
- `react-is` must be explicitly installed for Recharts to function correctly without throwing import resolution errors during dev server boot.

## Run commands

See the main **`README.md`** at the root of the project.
Required install sequence:
`npm install --legacy-peer-deps`
`npm install react-is --legacy-peer-deps`
`npm run dev`

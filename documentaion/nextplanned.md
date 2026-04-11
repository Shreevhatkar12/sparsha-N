# Next steps (short list)

High-value follow-ups now that core phases (forms, student profile, exams bulk, dashboard pending, brand UI) are in place:

1. **Automated tests** — Jest/Supertest for `backend` auth + one CRUD vertical; Vitest/RTL smoke for `frontend` login + dashboard.
2. **Auth hardening** — Document and optionally implement memory-only access token + refresh retry queue aligned with backend cookies.
3. **Legacy cleanup** — Reconcile `student.service.js` (and related JS routes) with current `schema.prisma`; delete dead paths.
4. **Pending metrics** — Tune `getPendingItemsData` / `getDashboardPendingCounts` heuristics with real NGO rules (what counts as “missing” attendance or forms).
5. **Observability** — Request logging, error tracking, health checks for production deploys.

**Authoritative status:** `documentaion/STATUS.md`  
**Runbook:** root `README.md`, `backend/README.md`, `frontend/README.md`

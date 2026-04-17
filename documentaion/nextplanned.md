# Next steps (short list)

High-value follow-ups now that core phases (forms, student profile, exams bulk, dashboard pending, brand UI) are in place:

1. **RBAC Transition** — Update `schema.prisma` and backend services to enforce the roles and permissions defined in `sparsha_rbac.md`.
2. **Resource Management** — Build the Equipment inventory and logging API to track organization assets across centers.
3. **Internal Messaging** — Implement threaded conversations between users (Role-scoped).
4. **Enhanced Activities** — Move from simple "sessions" to a robust Activity tracking system with status logs (Vaccine camps, distribution).
5. **Automated tests** — Jest/Supertest for `backend` auth + one CRUD vertical; Vitest/RTL smoke for `frontend` login + dashboard.
6. **Auth hardening** — Implementation of memory-only access tokens + refresh retry queue.

**Authoritative status:** `documentaion/STATUS.md`  
**Runbook:** root `README.md`, `backend/README.md`, `frontend/README.md`

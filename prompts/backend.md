# SPARSHA — Backend Vision Prompt

You are an expert Backend Engineer working on the SPARSHA Organization Management System. Your goal is to implement the core business logic and data persistence layers while strictly adhering to the RBAC rules.

### Core Principles
1. **Prisma First**: Always update `schema.prisma` before implementing services. Ensure all new tables use UUID keys and include `is_active` for soft deletes.
2. **Service Layer Enforcement**: Controllers should be thin. All complex permission logic (e.g., checking if a volunteer is assigned to an activity) should reside in the service layer.
3. **Soft Delete Habit**: Never use `prisma.delete`. Always use `update` with `is_active: false`.
4. **Center Scoping**: Every query involving student or center data MUST include a filter for `centerId` derived from the user's `allowedCenterIds`.

### Role-Specific Logic
- **super_admin**: Can see all centers. Filter is optional.
- **tech_admin**: MUST NOT have access to services that return PII (names, phones, dob). Use `SELECT` to exclude these columns.
- **volunteer**: Access is valid ONLY if `current_date` is between `valid_from` and `valid_until` in `user_activity_assignments`.

### Task-Specific Instructions
- When implementing **Equipment**, ensure every update creates an entry in `equipment_logs`.
- When implementing **Messaging**, ensure only participants in a thread can read its messages.
- When implementing **Activities**, ensure every status change is recorded in `activity_status_log`.

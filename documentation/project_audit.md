# Project Audit: Out-of-Place Elements & Configuration Errors

This document outlines the current discrepancies between the project implementation and the desired RBAC model/functionality, along with reasons and proposed fixes.

## 1. Redirect Issues (Missing Pages)
- **Affected Routes**: `/equipment`, `/messages`, `/announcements`, `/activities`.
- **Observation**: Clicking these items in the sidebar redirects the user back to the Dashboard.
- **Cause**: These routes are defined in `Sidebar.tsx` but are completely missing from the `App.tsx` routing configuration. Furthermore, the corresponding page components do not exist in `src/pages/`.
- **Effect**: Users cannot access these modules, breaking the expected navigation flow.

## 2. RBAC Discrepancies
- **Attendance Accessibility**:
    - **Observation**: `super_admin` has access to the "Attendance" module.
    - **User Requirement**: According to the desired model, `super_admin` (system-wide management) should NOT be involved in daily field tasks like attendance. This should be restricted to `teacher`, `volunteer`, and `center_admin`.
    - **Cause**: The `viewRoles` array in `Sidebar.tsx` and the `ProtectedRoute` logic in `App.tsx` currently include `super_admin` for nearly all routes.
- **Technical Admin Role**:
    - **Observation**: There is no dedicated `tech_admin` role configured in the frontend to handle technical support, password resets, and user management across the system.
    - **Cause**: This role was recently added to the backend types but hasn't been integrated into the frontend's RBAC hierarchy or seeding process.

## 3. Data Loading Errors
- **Exams**: "Could not load exam comparison."
    - **Cause**: Likely due to insufficient or inconsistent seed data for `Exam`, `ProgramSubject`, and `ExamScore`. Comparison logic requires both "baseline" and "endline" exams to exist for the same student/center.
- **Skills**: "No skill assessment."
    - **Cause**: `StudentSkillLog` and `SkillDefinition` entries are missing for most students in the current database state.

## 4. Proposed Fixes & Configuration Changes

### A. Routing & Pages
- [x] Create stub pages for `Equipment`, `Messages`, `Announcements`, and `Activities`.
- [x] Register these routes in `App.tsx`.

### B. RBAC Adjustments
- [x] Update `Sidebar.tsx` to remove `super_admin` from `Attendance`.
- [x] Add `tech_admin` to the system:
    - [x] Update frontend `UserRole` types.
    - [x] Grant `tech_admin` access to `Settings` and `Users` management.
    - [x] Create a specific seeding entry for `tech_admin_1`.

### C. Database Seeding Enhancement
- [x] Refactor `seed.ts` to include:
    - [x] `tech_admin_1` user.
    - [x] Multiple Teachers and Center Admins with appropriate ownership hierarchy.
    - [x] Complete Exam data (Baseline/Endline) for at least one center.
    - [x] Initial Skill Assessments for students.

# SPARSHA — Frontend Vision Prompt

You are a Senior Frontend Developer building the SPARSHA NGO Dashboard. Your goal is to create a responsive, role-aware, and highly functional interface.

### Core Principles
1. **Dynamic Navigation**: The sidebar Must be generated based on `currentUser.role`. Use a configuration-driven approach.
2. **Permission Hook**: Use a centralized `usePermission` hook to handle action-level visibility. Example: `const { can } = usePermission(); if (!can('edit', 'student')) return null;`.
3. **Data Fetching**: Prefer TanStack Query for performance and state management. Ensure all requests include the `Authorization` header from `useAuthStore`.
4. **Resiliency**: Handle loading and error states for every data-fetching component. Use Skeleton loaders for a premium feel.

### Role-Driven UX
- **super_admin**: Sees an NGO-wide dashboard. Can switch between centers via a global dropdown.
- **center_admin**: Sees only their center's stats.
- **teacher**: Focus is on the specific `Batch` and `Program` they are assigned to.
- **volunteer**: Sees a simplified UI restricted to the specific `Activity` they are currently assigned to.

### Module Specifics
- **Messaging**: Implement a real-time (polling or socket) threaded chat UI.
- **Equipment**: Build a table with bulk update capabilities for quantity and condition.
- **Announcements**: Ensure "Pinned" announcements are visually distinct at the top of the dashboard.

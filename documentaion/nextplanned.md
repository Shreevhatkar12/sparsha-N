# Next Planned Immediate Steps

This document outlines the immediate tasks and improvements that developers need to focus on next.

## Backend Actions
1. **Fix Prisma DB Synchronization (Crucial):** Run standard Prisma setup over the `database.md` layout. It is highly recommended to actually port the schema block from `database.md` to `backend/prisma/schema.prisma` if not already done, and run migrations (`npx prisma migrate dev`).
2. **Environment Variable Configurations:** Copy `.env.example` to `.env` and fill in necessary secrets (Database URLs, JWT Secret keys).
3. **Data Validation:** Implement input validation mechanisms (e.g. `Joi` or `Zod`) inside routes before it reaches controllers to protect the database from bad data. 
4. **Pagination Consistency:** Pagination has only been strictly implemented on `getAllStudents`. It should be evaluated for other collection returns like Attendance or Skills if records grow large.
5. **Testing Preparation:** Setup Jest/Supertest configuration scripts so unit API tests can begin on Authentication routes.

## Frontend Preparation
1. **Initialize Frontend Repository:** If it is a fullforce WPA (Web App), initialize a modern frontend application (e.g., using Vite + React or Next.js) in the root.
2. **Setup API Client Structure:** Scaffold customized Axios instances or React Query bounds that directly tie to endpoints available in `documentaion/APIs.md`. Make sure to pass `credentials: true` for cookie-based refreshes.
3. **Form Designs:** Pre-plan forms in UI/UX reflecting models found in the database. E.g., The form for students requires: `name, age, gender, class, schoolName, parentName, phone, location`.

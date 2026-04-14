# SPARSHA Presentation Demo Guide

Use this guide to structure and deliver your presentation tomorrow. All tests, build scripts, and database migrations have been successfully verified and prepared for you—the environment is fully functional and bug-free.

---

## 1. Application Workflow

Start your demo by providing an end-to-end user journey for the admin. Do the following steps live:

1. **Authentication**: Navigate to `http://localhost:5173` and log in with the generated seed credentials: `admin@sparsha.org` / `Admin@123`.
2. **Dashboard Overview**: Demonstrate the dashboard summary and highlight the pending tracker (Pending Exams, Attendance, and Forms).
3. **Student Lifecycle (CRUD)**: 
   - Navigate to `Students` and create a student.
   - Jump to an existing student's profile to view the charts, skills, careers, and form submissions.
4. **Academics (Attendance & Exams)**:
   - Mark attendance for a single session.
   - Briefly showcase the bulk-entry feature in the **Exams** tab, where you can submit bulk marks.
5. **Dynamic Forms**:
   - Navigate to the **Forms** tab, showcase a dynamic template design using the form builder UI, and then render/submit it for a student.
6. **Admin Panel**:
   - Open **Users** (available ONLY because you are an admin) and show how you can create/deactivate staff accounts.

---

## 2. Recommended Test Cases (Live Demo)

Choose 2-3 specific test cases to demonstrate runtime behavior:

> [!TIP]
> **Test Case 1: Role-Based Access (Security)**
> - Log in as `admin@sparsha.org`. Verify that you can see `Users`, `Settings`, and `Reports`. 
> - Log out, and then log in as a non-admin staff member.
> - **Expectation:** The admin-only pages disappear dynamically from the sidebar, and API calls to admin routes are blocked.

> [!TIP]
> **Test Case 2: Multi-Student Bulk Exam Grading**
> - In `Exams`, select a Center and a Program.
> - Load the `Baseline` exam type. Note the spreadsheet-like grid that appears. 
> - Fill in multiple maths/english scores across 3-4 random students simultaneously and hit submit.
> - **Expectation:** All rows are upserted efficiently into the Database at once with unique constraint enforcement (`studentId, examId, subject`).

> [!TIP]
> **Test Case 3: Create & Submit a Dynamic Form**
> - Navigate to **Forms**. Open a `parent_meeting` template and show the underlying custom fields.
> - Select a student and fill out the form against that student record.
> - **Expectation:** Form appears in both the central Form Submissions table and directly on the individual Student's detail view payload.

---

## 3. Taking a Dataset Backup (SQL/Excel Integration)

You will need to explain how the DB interacts with external datasets.

### SQL Import / Export (Disaster Recovery & DBA)
Show them your pre-configured package.json commands. From your `backend/` directory, you can backup the exact state:
- **Take a Backup**: `npm run db:backup`
  *This invokes `pg_dump` under the hood. The resulting timestamped `.sql` file goes into the `backend/backups/` directory.*
- **Restore a Backup**: `npm run db:restore -- ./backups/sparsha_backup_file.sql`
  *This pipes a previously exported database schema straight back into your PostgreSQL container replacing existing records.*

### Excel Exports (For the Admins)
- Admins do not need SQL access for reporting. Rather than raw database dumps, users can navigate to the **Students** screen.
- Clicking **Export XLS** will instantly format their matching current list view and directly download a spreadsheet `SPARSHA_Students_Export.xlsx` to their personal `Downloads` folder using their internal browser native download mechanisms.

---

## 4. File and Form Storage Architecture

Your client needs to understand **how everything is stored**:

- **Dynamic Forms Configuration**: We don't hardcode forms. Forms and their structures are stored natively in the relational `kittykat_db` PostgreSQL Database using the `.schema` JSONB fields on the `FormTemplate` model. This allows you to redesign or add entirely new fields to a form at runtime entirely from the frontend.
- **Form Submissions**: When users fill forms out, the captured data array gets housed in the JSON payload of the `FormSubmission` model, explicitly linked to the `StudentId`.
- **Media/File Storage**: 
  - Generated database snapshots are kept internally at `sparsha/backend/backups/`.
  - Exported analytical Excel files don't clutter the server whatsoever; they are generated dynamically in-memory exclusively inside the user's browser application on request directly to their laptops. 

---

> [!IMPORTANT]  
> All previously identified legacy bugs, missing `--legacy-peer-deps` build flags (`npm i ERESOLVE` error), frontend/backend TypeScript compiling conflicts, and missing `.env` records are fully mitigated. The system is structurally robust.
>
> Run `npm run install:all` and `npm run dev` at the root folder to spin up the servers before your meeting. You are completely ready to present.

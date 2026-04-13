# SPARSHA Meeting Demo Guide

Use this as a walkthrough for tomorrow's presentation.

## 1) Application workflow (live demo flow)

1. **Login**
   - Open `http://localhost:5173`
   - Login as admin (seed default): `admin@sparsha.org` / `Admin@123`
2. **Dashboard**
   - Show pending counters (attendance, exams, forms).
3. **Student lifecycle**
   - Go to `Students` -> create/update student -> open student details page.
4. **Attendance + exams**
   - Mark attendance and enter exam scores in the exam bulk grid.
5. **Forms**
   - Create/edit template in `Forms`, fill a form for a student, open submissions.
6. **Reports**
   - Show summary reports and export options.
7. **Admin management**
   - Open `Users` (admin only), create user, reset password, deactivate account.

## 2) Run 2-3 test cases during meeting

### Test case A: Auth + role-protected screens
- Login as admin and verify `Reports`, `Users`, and `Settings` are visible.
- Logout/login as non-admin and verify admin pages are hidden.

### Test case B: Student + form workflow
- Create a student.
- Fill any form for that student.
- Verify submission appears in `Forms -> Submissions` and student detail page.

### Test case C: Exam workflow
- Create/prepare exam.
- Enter marks for multiple students.
- Verify pending exam counts update and data is visible in reports/comparison.

## 3) Dataset / backup and restore (SQL)

From `backend/` directory:

```bash
npm run db:backup
```

- Output file is created in `backend/backups/` as `sparsha_backup_YYYYMMDD_HHMMSS.sql`.

Restore a backup:

```bash
npm run db:restore -- ./backups/<backup-file>.sql
```

Notes:
- Ensure `DATABASE_URL` is set in environment (or loaded from `.env`) before running.
- These commands use `pg_dump` and `psql`, so PostgreSQL client tools must be installed.

## 4) Import and export from Excel / SQL

### Excel export (already implemented)
- Go to `Students` page and click **Export XLS**.
- File downloaded: `SPARSHA_Students_Export.xlsx`.

### SQL export/import
- Export: `npm run db:backup`
- Import: `npm run db:restore -- ./backups/<backup-file>.sql`

## 5) Where files and forms are stored

### Forms
- Form templates and form submissions are stored in PostgreSQL via Prisma models:
  - `FormTemplate`
  - `FormSubmission`
- JSON schema/data storage fields:
  - template schema: `FormTemplate.schema`
  - submission payload: `FormSubmission.data`

### Files
- Generated files from this workflow are stored locally:
  - SQL backups: `backend/backups/`
  - Excel exports: browser download location

## 6) Commands to start everything quickly

From repo root:

```bash
npm run install:all
npm run dev
```

Or run separately:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

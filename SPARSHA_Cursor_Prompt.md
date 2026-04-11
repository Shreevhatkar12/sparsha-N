# SPARSHA Student Management System — Execution-Ready Cursor/Antigravity Prompt

---

## CONTEXT & INSTRUCTIONS FOR THE AI CODING TOOL

You are working on **SPARSHA** — an NGO-focused Student Administration & Management System (PWA). The codebase already exists with partially built frontend and backend. Your job is to **extend, connect, and improve** — not rewrite from scratch.

**Before making any changes:**
1. Read every file in `src/`, `server/`, `prisma/`, and the root config files.
2. Understand existing naming conventions, folder structure, component patterns, and API design.
3. Identify which APIs already exist and which are missing.
4. Only then proceed with implementation.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | React + Vite, TypeScript, Tailwind CSS |
| Backend | Node.js + Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Charts | Recharts |
| Forms | React Hook Form |
| HTTP Client | Axios |

---

## PHASE 1 — CODEBASE ANALYSIS (DO THIS FIRST)

Before writing any code, do the following analysis and document your findings internally:

1. Map all existing frontend routes (`src/pages/` or `src/routes/`)
2. Map all existing backend API routes (`server/routes/` or similar)
3. Identify all Prisma models in `prisma/schema.prisma`
4. Note which frontend modules use mock/static data vs. live API calls
5. Identify all existing reusable components
6. Note the current folder/file naming convention (camelCase, kebab-case, PascalCase, etc.)
7. Identify the existing auth mechanism (JWT, session, etc.)

---

## PHASE 2 — API SERVICE LAYER

### File to create: `src/services/api.ts`

Create a centralized Axios instance and typed service functions. Pattern:

```ts
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

Then create one service file per module:

- `src/services/students.service.ts`
- `src/services/attendance.service.ts`
- `src/services/exams.service.ts`
- `src/services/skills.service.ts`
- `src/services/career.service.ts`
- `src/services/forms.service.ts`
- `src/services/reports.service.ts`

Each service file exports typed async functions that call the API. Example:

```ts
// src/services/students.service.ts
import api from './api';
import type { Student } from '../types';

export const getStudents = (centerId?: string) =>
  api.get<Student[]>('/students', { params: { centerId } }).then(r => r.data);

export const getStudentById = (id: string) =>
  api.get<Student>(`/students/${id}`).then(r => r.data);

export const createStudent = (payload: Partial<Student>) =>
  api.post<Student>('/students', payload).then(r => r.data);

export const updateStudent = (id: string, payload: Partial<Student>) =>
  api.put<Student>(`/students/${id}`, payload).then(r => r.data);
```

---

## PHASE 3 — BACKEND: MISSING API ENDPOINTS

Analyze existing routes. For any module that is missing CRUD, add it following this pattern:

### Folder structure (follow existing or create):
```
server/
  routes/
    students.routes.ts
    attendance.routes.ts
    exams.routes.ts
    forms.routes.ts
    reports.routes.ts
  controllers/
    students.controller.ts
    ...
  services/
    students.service.ts
    ...
```

### Required endpoints (add only those missing):

**Students**
- `GET /api/students` — list, supports `?centerId=`, `?programId=`, `?search=`
- `GET /api/students/:id` — full profile with relations
- `POST /api/students` — create
- `PUT /api/students/:id` — update
- `DELETE /api/students/:id` — soft delete (set `isActive = false`)

**Attendance**
- `GET /api/attendance/sessions` — list sessions
- `POST /api/attendance/sessions` — create session with records in one transaction
- `GET /api/attendance/sessions/:id/records` — records for a session
- `GET /api/attendance/students/:studentId` — all records for a student

**Exams**
- `GET /api/exams` — list exams
- `POST /api/exams` — create exam
- `POST /api/exams/:examId/scores` — bulk upsert scores for all students
- `GET /api/exams/students/:studentId` — all exam scores for a student

**Forms (Dynamic)**
- `GET /api/forms/templates` — list all templates
- `GET /api/forms/templates/:id` — get single template with schema
- `POST /api/forms/templates` — create template (admin only)
- `PUT /api/forms/templates/:id` — update template
- `DELETE /api/forms/templates/:id` — soft delete
- `POST /api/forms/submissions` — submit a form response
- `GET /api/forms/submissions` — list submissions (supports `?templateId=`, `?studentId=`, `?centerId=`)

**Reports**
- `GET /api/reports/dashboard` — aggregate stats for admin dashboard
- `GET /api/reports/attendance` — attendance % by center/program/date range
- `GET /api/reports/skills` — skill averages
- `GET /api/reports/exams` — exam comparison (baseline vs endline)

### Backend validation pattern (use Zod):

```ts
import { z } from 'zod';

export const createStudentSchema = z.object({
  fullName: z.string().min(2),
  centerId: z.string().uuid(),
  programId: z.string().uuid(),
  dob: z.string().date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});
```

Middleware to validate:
```ts
export const validate = (schema: z.ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.flatten() });
  req.body = result.data;
  next();
};
```

---

## PHASE 4 — FRONTEND MODULE INTEGRATION

For each module, replace all static/mock data with live API calls using the service layer.

### Pattern for every data-fetching component:

```tsx
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  getStudents()
    .then(setData)
    .catch(() => setError('Failed to load data'))
    .finally(() => setLoading(false));
}, []);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
```

Create these shared components if not already present:

- `src/components/ui/LoadingSpinner.tsx`
- `src/components/ui/ErrorMessage.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/ConfirmModal.tsx`
- `src/components/ui/Button.tsx` — with variants: `primary`, `secondary`, `danger`, `ghost`
- `src/components/ui/Input.tsx` — with label, error, helper text
- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx` — status badges (present/absent, active/inactive)
- `src/components/ui/DataTable.tsx` — sortable, filterable table

---

## PHASE 5 — DYNAMIC FORMS MODULE

This is a new module. Build it from scratch.

### Architecture:

```
src/
  pages/
    Forms/
      FormsListPage.tsx         ← list all form templates
      FormBuilderPage.tsx       ← admin: create/edit form
      FormRendererPage.tsx      ← user: fill out a form
      FormSubmissionsPage.tsx   ← view submissions for a form
  components/
    forms/
      FieldEditor.tsx           ← drag-and-drop field config (admin)
      FieldRenderer.tsx         ← renders a single field dynamically
      FormPreview.tsx           ← live preview of form being built
```

### JSON Schema structure for a form template:

```json
{
  "fields": [
    {
      "id": "field_1",
      "type": "text",
      "label": "Student Name",
      "required": true,
      "placeholder": "Enter name"
    },
    {
      "id": "field_2",
      "type": "dropdown",
      "label": "Meeting Type",
      "required": true,
      "options": ["Academic", "Behavioral", "Parent Meeting"]
    },
    {
      "id": "field_3",
      "type": "date",
      "label": "Meeting Date",
      "required": true
    },
    {
      "id": "field_4",
      "type": "textarea",
      "label": "Notes",
      "required": false
    }
  ]
}
```

### FieldRenderer component logic:

```tsx
const FieldRenderer = ({ field, register, errors }) => {
  switch (field.type) {
    case 'text':
    case 'number':
      return <Input type={field.type} label={field.label} {...register(field.id, { required: field.required })} error={errors[field.id]?.message} />;
    case 'textarea':
      return <textarea {...register(field.id)} placeholder={field.placeholder} />;
    case 'dropdown':
      return (
        <select {...register(field.id, { required: field.required })}>
          <option value="">Select...</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case 'date':
      return <Input type="date" label={field.label} {...register(field.id)} />;
    case 'checkbox':
      return <input type="checkbox" {...register(field.id)} />;
    default:
      return null;
  }
};
```

### Form Builder (Admin):

Use `@dnd-kit/core` or a simple up/down reorder mechanism. Each field in the builder shows:
- Field type selector
- Label input
- Required toggle
- Options input (for dropdown)
- Delete button

Provide a live preview panel side-by-side (or toggled on mobile).

On save, POST the schema JSON to `POST /api/forms/templates`.

---

## PHASE 6 — STUDENT DETAIL PAGE

### Route: `/students/:id`

### Layout: Full-width, scrollable, data-rich

```
┌────────────────────────────────────────────────────┐
│  Student Profile Header                             │
│  [Avatar] Name | Center | Program | Status badge   │
│  Enrolled: xx/xx/xxxx | Age | Gender | Guardian    │
└────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Attendance % │  │ Avg Exam %   │  │ Skill Score  │
│ Big number   │  │ Big number   │  │ Big number   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────────┐  ┌──────────────────────┐
│ Attendance Trend          │  │ Exam Scores Chart    │
│ (Recharts BarChart)       │  │ (Baseline vs Endline)│
└──────────────────────────┘  └──────────────────────┘

┌──────────────────────────┐  ┌──────────────────────┐
│ Skill Radar Chart         │  │ Career Tracking      │
│ (Recharts RadarChart)     │  │ (Info cards)         │
└──────────────────────────┘  └──────────────────────┘

┌────────────────────────────────────────────────────┐
│  Form Submissions Table                             │
│  [Form Type] [Date] [Submitted By] [View]          │
└────────────────────────────────────────────────────┘
```

### Data fetching: one aggregated endpoint

Add: `GET /api/students/:id/profile` — returns all related data in one response:

```ts
// Backend controller
const profile = await prisma.student.findUnique({
  where: { id },
  include: {
    center: true,
    program: true,
    attendanceRecords: { include: { session: true }, orderBy: { session: { sessionDate: 'desc' } } },
    examScores: { include: { exam: true } },
    formSubmissions: { include: { template: true } },
    parents: { include: { parent: true } },
  }
});
```

### Chart implementations:

```tsx
// Attendance bar chart — last 10 sessions
<BarChart data={attendanceTrend}>
  <XAxis dataKey="date" />
  <YAxis />
  <Bar dataKey="present" fill="#dc2626" />
</BarChart>

// Skill radar chart
<RadarChart data={skillData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="skill" />
  <Radar dataKey="score" fill="#dc2626" fillOpacity={0.3} />
</RadarChart>

// Exam comparison (baseline vs endline)
<BarChart data={examData}>
  <XAxis dataKey="subject" />
  <Bar dataKey="baseline" fill="#fca5a5" name="Baseline" />
  <Bar dataKey="endline" fill="#dc2626" name="Endline" />
  <Legend />
</BarChart>
```

---

## PHASE 7 — UI/UX IMPROVEMENTS

### Color Theme (Red — NGO Branding)

```css
/* Add to tailwind.config.ts extend.colors */
colors: {
  brand: {
    50:  '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  }
}
```

Use `brand-700` as primary CTA, `brand-600` for hover, `brand-50` for backgrounds.

### Typography

Use `Sora` (headings) + `DM Sans` (body). Add to `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

### Layout Improvements

- Sidebar: fixed, 240px wide, collapsible on mobile
- Content area: max-width 1280px, centered, padding `px-6 py-8`
- Page headers: consistent — title (H1) + subtitle + action button on right
- All list pages: Card grid OR DataTable — pick one per module and be consistent

### Component Standards

**Button variants:**
```tsx
// primary
<button className="bg-brand-700 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">

// secondary
<button className="border border-brand-700 text-brand-700 hover:bg-brand-50 px-4 py-2 rounded-lg font-medium transition-colors">

// danger
<button className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors">
```

**Table standards:**
- Sticky header
- Alternating row colors: `even:bg-gray-50`
- Hover: `hover:bg-brand-50`
- Empty state: centered illustration + message

**Form inputs:**
```tsx
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-gray-700">{label}</label>
  <input className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
  {error && <span className="text-xs text-red-500">{error}</span>}
</div>
```

---

## PHASE 8 — CENTER-WISE ACCESS CONTROL

### Backend middleware:

```ts
// middleware/centerAccess.ts
export const restrictToUserCenters = async (req, res, next) => {
  if (req.user.role === 'admin') return next(); // admins see all
  
  const assignments = await prisma.userCenterAssignment.findMany({
    where: { userId: req.user.id, validUntil: null },
    select: { centerId: true }
  });
  
  req.allowedCenterIds = assignments.map(a => a.centerId);
  next();
};
```

Apply this middleware to all student/attendance/exam routes. In every Prisma query, filter by `centerId: { in: req.allowedCenterIds }` for non-admin users.

### Frontend:

Store the user's allowed centers in auth context. Filter dropdowns and UI to only show relevant centers.

---

## PHASE 9 — EXAM MODULE (BASELINE & ENDLINE)

### Exam entry flow (like attendance):

1. Teacher selects: Center → Program → Exam Type (Baseline/Endline) → Academic Year → Date
2. System loads all active students for that center+program
3. Shows a grid: rows = students, columns = English / Science / Maths / Remarks
4. Teacher fills marks (0–50 each)
5. Missing entries highlighted in yellow
6. Submit button saves all scores in one bulk upsert

### Backend bulk upsert:

```ts
// POST /api/exams/:examId/scores (bulk)
await prisma.$transaction(
  scores.map(s =>
    prisma.examScore.upsert({
      where: { examId_studentId_subject: { examId: s.examId, studentId: s.studentId, subject: s.subject } },
      update: { marks: s.marks, remarks: s.remarks },
      create: { ...s, centerId },
    })
  )
);
```

Add `@@unique([examId, studentId, subject])` to `ExamScore` in prisma schema if not already present.

---

## PHASE 10 — MULTI-FORM UPLOAD SYSTEM

Form types currently needed:
- `student_meeting` — Student Meeting Form
- `parent_meeting` — Parent Meeting Form
- `activity_form` — Activity Form

These are stored as `formType` in the `form_templates` table. The system is already schema-flexible — just seed initial templates and ensure the UI can filter by `formType`.

Add a `formType` filter to `FormsListPage.tsx`.

---

## PHASE 11 — ALERTS FOR PENDING TASKS

Add a `PendingTasks` widget to the Dashboard that shows:

```ts
// GET /api/dashboard/pending
{
  missingAttendance: number,    // sessions in last 7 days with < 100% records
  incompleteExams: number,      // exams with missing scores
  pendingForms: number          // any forms not yet submitted this month
}
```

Show as notification badges on sidebar nav items too.

---

## FILE STRUCTURE SUMMARY (New Files to Create)

```
src/
  services/
    api.ts
    students.service.ts
    attendance.service.ts
    exams.service.ts
    forms.service.ts
    skills.service.ts
    career.service.ts
    reports.service.ts
  components/
    ui/
      Button.tsx
      Input.tsx
      Card.tsx
      Badge.tsx
      DataTable.tsx
      LoadingSpinner.tsx
      ErrorMessage.tsx
      EmptyState.tsx
      ConfirmModal.tsx
    forms/
      FieldEditor.tsx
      FieldRenderer.tsx
      FormPreview.tsx
  pages/
    Students/
      StudentDetailPage.tsx     ← new (Phase 6)
    Forms/
      FormsListPage.tsx         ← new
      FormBuilderPage.tsx       ← new
      FormRendererPage.tsx      ← new
      FormSubmissionsPage.tsx   ← new

server/
  middleware/
    centerAccess.ts             ← new
    validate.ts                 ← new (Zod middleware)
  routes/
    forms.routes.ts             ← new
    reports.routes.ts           ← new (if missing)
  controllers/
    forms.controller.ts         ← new
    reports.controller.ts       ← new (if missing)
  services/
    forms.service.ts            ← new
    reports.service.ts          ← new (if missing)
```

---

## EXECUTION ORDER

Follow this order to avoid blocking yourself:

1. **Analyze codebase** — identify all existing patterns, routes, components
2. **Create API service layer** (`src/services/`)
3. **Add missing backend routes** (forms, reports, student profile)
4. **Add center-access middleware** to backend
5. **Connect existing frontend modules** to real APIs (Students → Attendance → Skills → Career → Exams)
6. **Build shared UI components** (Button, Input, DataTable, etc.)
7. **Build Student Detail Page** with charts
8. **Build Forms Module** (Builder → Renderer → Submissions)
9. **Exam bulk-entry UI**
10. **Dashboard pending tasks widget**
11. **Global UI polish** — apply red theme, typography, spacing consistently across all pages

---

## CONSTRAINTS TO RESPECT

- Do NOT change the Prisma schema structure except to add missing `@@unique` constraints
- Do NOT rename existing API routes (only add new ones)
- Do NOT switch state management libraries — use whatever is already in place
- Do NOT introduce new major dependencies without checking if an existing package covers the need
- Keep all new components inside `src/components/` following existing naming patterns
- All TypeScript types go in `src/types/` — create an `index.ts` barrel export

---

## IMPLEMENTATION STATUS (maintain as you ship)

| Phase | Status |
|-------|--------|
| 1–4 Analysis, API layer, backend gaps, frontend integration + shared UI | Delivered in repo (see `src/services/`, `backend/src/routes/`) |
| **5 — Dynamic forms** | **Done:** `FormsListPage`, `FormBuilderPage`, `FormRendererPage`, `FormSubmissionsPage`; `FieldEditor` / `FieldRenderer` / `FormPreview`; list supports **form type** filter |
| **6 — Student detail** | **Done:** `GET /api/students/:id/profile` + `StudentDetails` charts (attendance bar, exam baseline/endline bar, skills radar when data exists), form submissions table, careers block |
| 7 — UI/UX theme (red brand, fonts) | **Done:** `brand-*` tokens + Sora/DM Sans; layout max-width 1280px; buttons/inputs use brand |
| 8 — Center-wise access | **Done:** JWT `centerIds` from active assignments only (`validUntil: null`); `centerScope` + `attachAllowedCenters` middleware file |
| 9 — Exam bulk entry | **Done:** `Exams` page grid + `@@unique` on `ExamScore` + transactional upsert |
| 10 — Multi-form / seeds | **Done:** `student_meeting`, `parent_meeting`, `activity_form` in seed; form-type filter on list |
| 11 — Pending tasks | **Done:** `GET /api/dashboard/pending` + dashboard widget + sidebar badges |

**Living documentation:** `documentaion/STATUS.md` (progress report), root `README.md` (run steps), `backend/README.md`, `frontend/README.md`.

*This prompt was generated for use with Cursor or Antigravity IDE. The tool should analyze the full codebase before beginning any implementation.*

# PROMPT 1 — JavaScript to TypeScript Migration
## For Cursor / Antigravity

---

## YOUR ROLE

You are a senior TypeScript engineer working on **SPARSHA** — an NGO Student Management System built with React (Vite) + Node.js/Express + Prisma. Your task is to migrate all remaining JavaScript files to TypeScript with full type safety. Do not break any existing functionality.

---

## STEP 1 — AUDIT FIRST (DO NOT CHANGE ANYTHING YET)

Scan the entire codebase and produce a migration checklist:

1. List every `.js` and `.jsx` file in `src/` (frontend)
2. List every `.js` file in `server/` (backend) — excluding `node_modules/`
3. For each file, note:
   - File path
   - What it does (one line)
   - Complexity: Low / Medium / High
   - Dependencies it imports (are those already `.ts`?)
4. Check `tsconfig.json` (root, `src/`, and `server/` if separate) — note `strict`, `noImplicitAny`, `strictNullChecks` settings
5. Check `package.json` for existing `@types/*` packages
6. Identify any missing `@types/*` packages that will be needed

**Output this audit as a comment block before starting any migration. Do not skip this.**

---

## STEP 2 — TSCONFIG SETUP

Before migrating files, ensure TypeScript is properly configured.

### Frontend `tsconfig.json` — verify these settings exist:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### Backend `tsconfig.json` — verify these settings exist:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Add missing settings — do NOT remove existing ones without checking they are not needed.

---

## STEP 3 — INSTALL MISSING TYPE PACKAGES

Based on your audit, install any missing `@types/*` packages. Common ones for this stack:

```bash
# Frontend
npm install --save-dev @types/react @types/react-dom @types/node

# Backend
npm install --save-dev @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/multer
```

Only install what is actually missing. Do not install types for packages that already bundle their own types (e.g., Prisma, Zod, Axios, React Hook Form).

---

## STEP 4 — SHARED TYPE DEFINITIONS

Create a shared types file if it does not exist:

### `src/types/index.ts` (frontend)

```ts
// Mirror your Prisma models here for frontend use
// Keep in sync with prisma/schema.prisma

export type UserRole = 'admin' | 'teacher' | 'staff' | 'volunteer' | 'parent' | 'shareholder';
export type Gender = 'male' | 'female' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type ExamType = 'baseline' | 'endline';

export interface Center {
  id: string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  ageMin?: number;
  ageMax?: number;
  description?: string;
  isActive: boolean;
}

export interface Student {
  id: string;
  centerId: string;
  programId: string;
  fullName: string;
  dob?: string;
  gender?: Gender;
  guardianName?: string;
  guardianPhone?: string;
  enrollmentDate: string;
  isActive: boolean;
  createdAt: string;
  center?: Center;
  program?: Program;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  centerId: string;
  programId: string;
  activityId?: string;
  sessionDate: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  centerId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface Exam {
  id: string;
  centerId: string;
  programId: string;
  examType: ExamType;
  academicYear: string;
  examDate?: string;
}

export interface ExamScore {
  id: string;
  examId: string;
  studentId: string;
  centerId: string;
  subject: string;
  marks?: number;
  maxMarks: number;
  remarks?: string;
}

export interface FormTemplate {
  id: string;
  formType: string;
  name: string;
  schema: FormSchema;
  isActive: boolean;
  createdAt: string;
}

export interface FormSchema {
  fields: FormField[];
}

export type FormFieldType = 'text' | 'number' | 'dropdown' | 'checkbox' | 'date' | 'textarea';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormSubmission {
  id: string;
  templateId: string;
  studentId: string;
  centerId: string;
  submittedBy?: string;
  data: Record<string, unknown>;
  createdAt: string;
}

// API response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Auth
export interface AuthUser extends User {
  allowedCenterIds: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
```

### `server/src/types/express.d.ts` (backend — augment Express Request)

```ts
import type { AuthUser } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      allowedCenterIds?: string[];
    }
  }
}
```

---

## STEP 5 — MIGRATION RULES

Apply these rules consistently for every file you migrate:

### Rule 1 — Rename files
- `.js` → `.ts`
- `.jsx` → `.tsx`
- Update all import paths across the codebase after renaming.

### Rule 2 — Type all function parameters and return types
```ts
// ❌ Before
const getStudents = async (centerId) => { ... }

// ✅ After
const getStudents = async (centerId: string): Promise<Student[]> => { ... }
```

### Rule 3 — Type all useState hooks
```ts
// ❌ Before
const [students, setStudents] = useState([]);
const [loading, setLoading] = useState(false);

// ✅ After
const [students, setStudents] = useState<Student[]>([]);
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
```

### Rule 4 — Type all props with interfaces
```ts
// ❌ Before
const StudentCard = ({ student, onDelete }) => { ... }

// ✅ After
interface StudentCardProps {
  student: Student;
  onDelete: (id: string) => void;
}
const StudentCard = ({ student, onDelete }: StudentCardProps) => { ... }
```

### Rule 5 — Type all event handlers
```ts
// ❌ Before
const handleChange = (e) => setName(e.target.value);
const handleSubmit = (e) => { e.preventDefault(); ... }

// ✅ After
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); ... }
```

### Rule 6 — Type Express route handlers
```ts
import type { Request, Response, NextFunction } from 'express';

// ❌ Before
export const getStudents = async (req, res) => { ... }

// ✅ After
export const getStudents = async (req: Request, res: Response): Promise<void> => { ... }
```

### Rule 7 — Type Prisma results
Prisma generates its own types. Use them:
```ts
import type { Student, Center, Prisma } from '@prisma/client';

// For complex includes:
type StudentWithRelations = Prisma.StudentGetPayload<{
  include: { center: true; program: true }
}>;
```

### Rule 8 — Handle `unknown` from catch blocks
```ts
// ❌ Before
} catch (err) {
  setError(err.message);
}

// ✅ After
} catch (err) {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  setError(message);
}
```

### Rule 9 — Remove all `any` types
`any` defeats TypeScript. Use `unknown` for truly unknown values, then narrow. Example:
```ts
// ❌
const data: any = response.data;

// ✅
const data: Student[] = response.data as Student[];
// OR use a type guard:
function isStudent(val: unknown): val is Student {
  return typeof val === 'object' && val !== null && 'fullName' in val;
}
```

### Rule 10 — Environment variables
```ts
// Create src/config/env.ts
const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const config = {
  jwtSecret: requiredEnv('JWT_SECRET'),
  databaseUrl: requiredEnv('DATABASE_URL'),
  port: parseInt(process.env.PORT || '3000', 10),
} as const;
```

---

## STEP 6 — MIGRATION ORDER

Migrate files in this dependency order to avoid cascading errors:

1. `src/types/index.ts` — shared types (create first)
2. `server/src/types/` — backend types and Express augmentation
3. `src/config/` and `server/src/config/` — config/env files
4. `src/services/` — API service layer
5. `server/src/middleware/` — auth, validation, center-access middleware
6. `server/src/services/` — backend service layer (uses Prisma types)
7. `server/src/controllers/` — controllers (uses service types)
8. `server/src/routes/` — route files
9. `src/hooks/` — custom React hooks
10. `src/components/ui/` — base UI components
11. `src/components/` — feature components
12. `src/pages/` — page components (migrate last, depend on everything else)

---

## STEP 7 — VERIFICATION

After every file migration, verify:

```bash
# Frontend type check
npx tsc --noEmit

# Backend type check (from server/ directory)
npx tsc --noEmit
```

**Do not move to the next file if there are TypeScript errors in the current one.**

Fix errors immediately before continuing. If a type is genuinely difficult to infer (e.g., a complex third-party library return type), use a specific type assertion with a comment explaining why — never use `any` silently.

---

## CONSTRAINTS

- Do NOT change any business logic while migrating — only add types
- Do NOT rename variables, functions, or components during migration
- Do NOT change import paths except to update `.js` → `.ts` extensions
- Do NOT enable `allowJs: true` as a workaround — migrate the file properly
- If a file is already `.ts` or `.tsx`, check if it has `any` types that need fixing, but do not otherwise touch it

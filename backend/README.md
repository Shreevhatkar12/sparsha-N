# Sparsha Backend

Express + TypeScript + Prisma backend for Sparsha NGO.

## Runtime Requirement

- Recommended Node.js: `22.x` (Prisma 7 ecosystem)
- Node 20 may run, but Prisma packages can emit engine warnings.

## Overview

Backend currently provides APIs for:

- Authentication (`/api/auth`)
- Students, attendance, skills, careers, and dashboard (`/api/students`)
- Attendance sessions (`/api/attendance`)
- Exams (`/api/exams`)
- Forms (`/api/forms`)
- Centers and programs (`/api/centers`, `/api/programs`)
- Users (`/api/users`)
- Activities (`/api/activities`)
- Reports (`/api/reports`)

## Tech Stack

- Express 5
- Prisma + PostgreSQL
- JWT auth
- Zod (validation in progress across modules)

## Run

```bash
npm install
npx prisma generate
npm run dev
```

## Build and Start

```bash
npm run build
npm run start
```

## Important Files

- `src/app.ts`: app wiring and route registration
- `src/server.ts`: server bootstrap
- `prisma/schema.prisma`: data model
- `src/routes/`: route modules
- `src/controllers/` and `src/services/`: controller/service layers

## Environment

Copy and configure:

```bash
cp .env.example .env
```

Set at minimum:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`

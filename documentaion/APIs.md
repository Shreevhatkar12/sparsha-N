# APIs Reference

All backend API endpoints fall under the `/api` prefix.

## 1. Authentication APIs (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/register` | Register a new user | Public |
| POST | `/login` | Authenticate an existing user | Public |
| POST | `/refresh` | Refresh JWT using cookie | Public |
| POST | `/logout` | Log out the user | Public |
| GET | `/me` | Get the logged-in user's details | Protected |
| PUT | `/change-password` | Update current user's password | Protected |

## 2. Student APIs (`/api/students`)
*All student APIs are accessible only by authenticated users (Protected).*

### Dashboard & General
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Retrieve overall dashboard statistics |
| GET | `/` | Get all students (Supports `page`, `limit`, `search` query params) |
| POST | `/` | Create a new student profile |
| GET | `/:id` | Get student details by ID |
| PUT | `/:id` | Update an existing student profile |
| DELETE| `/:id` | Remove a student |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/:studentId/attendance` | Get all attendance records for a student |
| POST | `/:studentId/attendance` | Add an attendance record |
| PUT | `/attendance/:id` | Update a specific attendance record |

### Skills
| Method | Endpoint | Description |
|---|---|---|
| GET | `/:studentId/skills` | Get all skills records associated with a student |
| POST | `/:studentId/skills` | Add new skills tracking to a student |
| PUT | `/skills/:id` | Update a particular skills metric record |

### Careers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/:studentId/careers` | Retrieve career planning data for a student |
| POST | `/:studentId/careers` | Add career planning details |
| PUT | `/careers/:id` | Update an existing career record |

> Note: Error handling is unified. Most failed endpoints will output JSON containing `{ success: false, message: "Reason" }`.

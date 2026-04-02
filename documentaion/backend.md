# KittyKat Backend Architecture & Overview

## Stack & Technologies
- **Runtime:** Node.js (with ECMAScript Modules enabled `type: "module"`)
- **Framework:** Express.js 5.2.1
- **Database ORM:** Prisma Client 7.6.0
- **Database:** PostgreSQL (as defined in Prisma `database.md` schema)
- **Security:** Helmet, CORS, Cookie-parser
- **Authentication:** JWT (`jsonwebtoken`), Password hashing (`bcryptjs`)
- **Environment Management:** dotenv
- **Logging:** Morgan

## Folder Structure
The backend logic is centralized within the `backend/src/` folder:
- `controllers/`: Handles incoming HTTP requests and returns responses (`auth.controller.js`, `student.controller.js`).
- `services/`: Encapsulates business logic, database queries, and interacts with Prisma.
- `routes/`: Maps API endpoints to their respective controllers (`auth.route.js`, `student.route.js`).
- `middlewares/`: Contains Express middlewares like the `protect` function for authenticated routes.
- `lib/`: Holds utility or library instances like the shared `prisma.js` connection.
- `app.js`: Connects middlewares, routes, and error handling logic.
- `server.js`: Entry point. Connects to the database and starts the Express server.

## Current Progress & Situation
- **Authentication:** Fully implemented (Registration, Login, Getting User Data, Logout, Refresh Tokens, Password Change).
- **Student Management:** Fully scaffolded for Students, Attendance, Skills, and Careers entities.
- **Database Connection:** A `database.md` file tracks the Prisma models, defining relationships between User, Student, Attendance, Skill, and Career entities.

> **Note:** A bug was present in `app.js` importing`.routes.js` files while the actual files were named `.route.js`. This has been fixed.

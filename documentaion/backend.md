# KittyKat Backend Architecture & Implementation Details

## State of the Backend & Technical Foundations

### 1. Framework Implementation logic
- The core router logic delegates everything rapidly to the layer in `src/controllers/`, which primarily parses HTTP components (extracting `req.body`, `req.query`, `req.user`, `req.cookies`). 
- Actual data mutation lives strictly within `src/services/` (such as `auth.service.js` and `student.service.js`). This makes unit testing services easy without spinning up an Express server wrapper.

### 2. Authorization Design (Dual Token Strategy)
- The app implements a **Cookie-based Refresh Architecture**, prioritizing security.
- On `/login` or `/register`, the backend sends down a short-lived `accessToken` locally parsed by the frontend, AND attaches a 7-day `refreshToken` inside a `SameSite=Strict, HttpOnly` cookie.
- The `auth.middleware.js` currently requires the frontend to manually attach `Authorization: Bearer <accessToken>` to headers for any protected routes. If the `accessToken` expires, the frontend hits `/api/auth/refresh` sending that HttpOnly cookie implicitly, fetching a new `accessToken`.

### 3. Database Abstraction via Prisma
- The Prisma schema tracks relational bindings.
- Deletions are mapped strictly. If you delete a `Student`, refer to the Prisma schema (`database.md` layout) `relation(..., onDelete: CASCADE/RESTRICT)` config. Currently, constraints require attendance and skills to be managed directly unless explicit cascade deletes are run.
- Complex data extraction happens in queries like `getDashboardStats`, where Prisma's `.aggregate()` function retrieves system-wide averages effortlessly.

### 4. Search and Pagination Logic
- Real-time search is embedded into the `/api/students` `GET` route. The DB queries check constraints against: `name`, `schoolName`, `location`, or `phone` returning case-insensitive matching fields seamlessly.
- Returned metadata uniformly responds with `.total`, `.page`, `.limit` and `.totalPages` for grid alignments on the frontend. 

### 5. Error Pipeline
- Handled via `next(err)` passed from controllers, captured globally at the bottom of `app.js`. When `err.statusCode` is omitted, it defaults to a generic 500 format avoiding stack-trace dumps into client responses inside production environments.

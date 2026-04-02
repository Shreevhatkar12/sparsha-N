import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.route.js";
import studentRoutes from "./routes/student.route.js";

const app = express();

/* ─────────────────────────────────────────
   Security & Middleware
───────────────────────────────────────── */
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // allow cookies (refresh token)
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

/* ─────────────────────────────────────────
   Routes
───────────────────────────────────────── */
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

/* ─────────────────────────────────────────
   404 Handler
───────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

/* ─────────────────────────────────────────
   Global Error Handler
───────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({ success: false, message });
});

export default app;
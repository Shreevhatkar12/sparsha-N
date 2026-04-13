import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler.ts";
import attendanceRoutes from "./routes/attendanceRoutes.ts";
import examRoutes from "./routes/examRoutes.ts";
import formRoutes from "./routes/formRoutes.ts";
import centerRoutes, { programRoutes } from "./routes/centerRoutes.ts";
import userRoutes from "./routes/userRoutes.ts";
import activityRoutes from "./routes/activityRoutes.ts";
import authRoutes from "./routes/auth.route.ts";
import reportRoutes from "./routes/reportRoutes.ts";
import dashboardRoutes from "./routes/dashboardRoutes.ts";
import studentRoutes from "./routes/student.route.ts";

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(limiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/centers", centerRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(errorHandler);

export default app;

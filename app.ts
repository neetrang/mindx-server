import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { ErrorMiddleware } from "./middleware/error";

import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import notificationRoute from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.route";
import layoutRouter from "./routes/layout.route";

require("dotenv").config();

export const app = express();

/* ================== MIDDLEWARE ================== */
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://mindx-client.vercel.app",
    "https://mindx-client-9bdminc5t-maitrangs-projects.vercel.app"
  ],
  credentials: true,
}));

app.options("*", cors()); // 🔥 FIX CORS VERCEL

app.set("trust proxy", 1);

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skip: (req) => req.method === "OPTIONS",
}));


/* ================== HEALTH CHECK (Render cần) ================== */
app.get("/healthz", (req: Request, res: Response) => {
  res.status(200).send("ok");
});

/* ================== ROUTES ================== */
app.use("/api/v1", userRouter);
app.use("/api/v1", courseRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", notificationRoute);
app.use("/api/v1", analyticsRouter);
app.use("/api/v1", layoutRouter);

app.get("/test", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "testing api",
  });
});

/* ================== 404 ================== */
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err: any = new Error(`Route ${req.originalUrl} not found`);
  err.status = 404;
  next(err);
});

/* ================== ERROR HANDLER ================== */
app.use(ErrorMiddleware);

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ErrorMiddleware } from './middleware/error';
import { rateLimit } from 'express-rate-limit';
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import notificationRoute from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';
import layoutRouter from './routes/layout.route';

require('dotenv').config();

export const app = express();

// Body parser
app.use(express.json({ limit: "50mb" }));

// Cookie parser
app.use(cookieParser());

// CORS
app.use(cors({
  origin: 'http://localhost:3000', // client Next.js
  credentials: true,
}));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/v1', userRouter);
app.use('/api/v1', courseRouter);
app.use('/api/v1', orderRouter);
app.use('/api/v1', notificationRoute);
app.use('/api/v1', analyticsRouter);
app.use('/api/v1', layoutRouter);

// Test route
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'testing api' });
});

// Unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.status = 404;
  next(err);
});

// Error middleware
app.use(ErrorMiddleware);

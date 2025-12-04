require('dotenv').config();
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";

// Middleware xác thực user/admin
export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // Lấy token từ cookie
    const access_token = req.cookies.access_token as string;

    if (!access_token) {
      return next(new ErrorHandler("Access token not found. Please login.", 401));
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;
    } catch (err: any) {
      return next(new ErrorHandler("Invalid or expired access token", 401));
    }

    // Lấy user từ Redis
    const user = await redis.get(decoded.id);
    if (!user) {
      return next(new ErrorHandler("User not found in session", 401));
    }

    req.user = JSON.parse(user);
    next();
  }
);

// Middleware phân quyền theo role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || '')) {
      return next(
        new ErrorHandler(
          `Role: ${req.user?.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};

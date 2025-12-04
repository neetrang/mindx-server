"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.isAuthenticated = void 0;
require('dotenv').config();
const catchAsyncErrors_1 = require("./catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../utils/redis");
// Middleware xác thực user/admin
exports.isAuthenticated = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    // Lấy token từ cookie
    const access_token = req.cookies.access_token;
    if (!access_token) {
        return next(new ErrorHandler_1.default("Access token not found. Please login.", 401));
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(access_token, process.env.ACCESS_TOKEN);
    }
    catch (err) {
        return next(new ErrorHandler_1.default("Invalid or expired access token", 401));
    }
    // Lấy user từ Redis
    const user = await redis_1.redis.get(decoded.id);
    if (!user) {
        return next(new ErrorHandler_1.default("User not found in session", 401));
    }
    req.user = JSON.parse(user);
    next();
});
// Middleware phân quyền theo role
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role || '')) {
            return next(new ErrorHandler_1.default(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;

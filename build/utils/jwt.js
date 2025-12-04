"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.createRefreshToken = exports.createAccessToken = exports.refreshTokenOptions = exports.accessTokenOptions = void 0;
require('dotenv').config();
const redis_1 = require("./redis");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "1", 10); // hours
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "7", 10); // days
const isProd = process.env.NODE_ENV === "production";
exports.accessTokenOptions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
};
exports.refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
};
// Tạo access token
const createAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN, {
        expiresIn: `${accessTokenExpire}h`,
    });
};
exports.createAccessToken = createAccessToken;
// Tạo refresh token
const createRefreshToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN, {
        expiresIn: `${refreshTokenExpire}d`,
    });
};
exports.createRefreshToken = createRefreshToken;
// Gửi token qua cookie
const sendToken = async (user, statusCode, res) => {
    const accessToken = (0, exports.createAccessToken)(user);
    const refreshToken = (0, exports.createRefreshToken)(user);
    // Lưu user vào Redis theo id để quản lý session
    await redis_1.redis.set(String(user._id), JSON.stringify(user));
    res.cookie("access_token", accessToken, exports.accessTokenOptions);
    res.cookie("refresh_token", refreshToken, exports.refreshTokenOptions);
    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    });
};
exports.sendToken = sendToken;

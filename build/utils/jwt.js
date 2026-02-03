"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.refreshTokenOptions = exports.accessTokenOptions = void 0;
require("dotenv").config();
const redis_1 = require("./redis");
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "300", 10);
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "1200", 10);
/* ================== COOKIE OPTIONS ================== */
// 🔥 CHUẨN cho Vercel (frontend) + Render (backend)
exports.accessTokenOptions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none", // 🔥 BẮT BUỘC
    secure: true, // 🔥 BẮT BUỘC
};
exports.refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none", // 🔥 BẮT BUỘC
    secure: true, // 🔥 BẮT BUỘC
};
/* ================== SEND TOKEN ================== */
const sendToken = (user, statusCode, res) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    // lưu session redis
    redis_1.redis.set(String(user._id), JSON.stringify(user));
    res.cookie("access_token", accessToken, exports.accessTokenOptions);
    res.cookie("refresh_token", refreshToken, exports.refreshTokenOptions);
    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    });
};
exports.sendToken = sendToken;

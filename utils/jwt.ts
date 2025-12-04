require('dotenv').config();
import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import jwt from "jsonwebtoken";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "1", 10); // hours
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "7", 10); // days

const isProd = process.env.NODE_ENV === "production";

export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

// Tạo access token
export const createAccessToken = (user: IUser) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN as string, {
    expiresIn: `${accessTokenExpire}h`,
  });
};

// Tạo refresh token
export const createRefreshToken = (user: IUser) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, {
    expiresIn: `${refreshTokenExpire}d`,
  });
};

// Gửi token qua cookie
export const sendToken = async (user: IUser, statusCode: number, res: Response) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  // Lưu user vào Redis theo id để quản lý session
  await redis.set(String(user._id), JSON.stringify(user));

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};

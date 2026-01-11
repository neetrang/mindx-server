import { NextFunction, Request, Response } from "express";
import path from "path";
import ejs from "ejs";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import { getAllOrdersService, newOrder } from "../services/order.service";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";
import { redis } from "../utils/redis";

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/* ======================= TẠO ĐƠN HÀNG ======================= */
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;

      /* ===== Kiểm tra thanh toán Stripe ===== */
      if (payment_info && "id" in payment_info) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment_info.id
        );

        if (paymentIntent.status !== "succeeded") {
          return next(
            new ErrorHandler("Thanh toán chưa được xác nhận.", 400)
          );
        }
      }

      /* ===== Lấy thông tin người dùng ===== */
      const user = await userModel.findById(req.user?._id);

      const courseExistInUser = user?.courses.some(
        (course: any) => course._id.toString() === courseId
      );

      if (courseExistInUser) {
        return next(
          new ErrorHandler("Bạn đã mua khóa học này rồi.", 400)
        );
      }

      /* ===== Lấy thông tin khóa học ===== */
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Không tìm thấy khóa học.", 404));
      }

      const orderData = {
        courseId: course._id,
        userId: user?._id,
      };

      /* ===== Dữ liệu gửi email ===== */
      const mailData = {
        order: {
          _id: course._id,
          name: course.name,
          price: new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(course.price),
          date: new Date().toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        mailData
      );

      /* ===== Gửi email xác nhận ===== */
      if (user) {
        await sendMail({
          email: user.email,
          subject: "Xác nhận đơn hàng",
          template: "order-confirmation.ejs",
          data: mailData,
        });
      }

      /* ===== Cập nhật user ===== */
      const courseid:any=course?._id;
        user?.courses.push(courseid);
        await redis.set(req.user?._id,JSON.stringify(user));
        await user?.save();

      /* ===== Tạo thông báo ===== */
      await NotificationModel.create({
        user: user?._id,
        title: "Đơn hàng mới",
        message: `Bạn đã mua thành công khóa học "${course.name}".`,
      });

      /* ===== Cập nhật khóa học ===== */
      course.purchased += 1;
      await course.save();

      /* ===== Tạo order ===== */
      await (newOrder as any)(orderData, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

/* ======================= LẤY TẤT CẢ ĐƠN HÀNG ======================= */
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

/* ======================= STRIPE KEY ======================= */
export const sendStripePublishableKey = CatchAsyncError(
  async (req: Request, res: Response) => {
    res.status(200).json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  }
);

/* ======================= TẠO PAYMENT ======================= */
export const newPayment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const myPayment = await stripe.paymentIntents.create({
        amount: req.body.amount * 100, // VND → đơn vị nhỏ nhất
        currency: "vnd",
        metadata: {
          company: "MindX",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.status(201).json({
        success: true,
        client_secret: myPayment.client_secret,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

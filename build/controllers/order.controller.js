"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newPayment = exports.sendStripePublishableKey = exports.getAllOrders = exports.createOrder = void 0;
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const user_model_1 = __importDefault(require("../models/user.model"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const course_model_1 = __importDefault(require("../models/course.model"));
const order_service_1 = require("../services/order.service");
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
const redis_1 = require("../utils/redis");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
/* ======================= TẠO ĐƠN HÀNG ======================= */
exports.createOrder = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { courseId, payment_info } = req.body;
        /* ===== Kiểm tra thanh toán Stripe ===== */
        if (payment_info && "id" in payment_info) {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment_info.id);
            if (paymentIntent.status !== "succeeded") {
                return next(new ErrorHandler_1.default("Thanh toán chưa được xác nhận.", 400));
            }
        }
        /* ===== Lấy thông tin người dùng ===== */
        const user = await user_model_1.default.findById(req.user?._id);
        const courseExistInUser = user?.courses.some((course) => course._id.toString() === courseId);
        if (courseExistInUser) {
            return next(new ErrorHandler_1.default("Bạn đã mua khóa học này rồi.", 400));
        }
        /* ===== Lấy thông tin khóa học ===== */
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Không tìm thấy khóa học.", 404));
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
        await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/order-confirmation.ejs"), mailData);
        /* ===== Gửi email xác nhận ===== */
        if (user) {
            await (0, sendMail_1.default)({
                email: user.email,
                subject: "Xác nhận đơn hàng",
                template: "order-confirmation.ejs",
                data: mailData,
            });
        }
        /* ===== Cập nhật user ===== */
        const courseid = course?._id;
        user?.courses.push(courseid);
        await redis_1.redis.set(req.user?._id, JSON.stringify(user));
        await user?.save();
        /* ===== Tạo thông báo ===== */
        await notification_model_1.default.create({
            user: user?._id,
            title: "Đơn hàng mới",
            message: `Bạn đã mua thành công khóa học "${course.name}".`,
        });
        /* ===== Cập nhật khóa học ===== */
        course.purchased += 1;
        await course.save();
        /* ===== Tạo order ===== */
        await order_service_1.newOrder(orderData, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
/* ======================= LẤY TẤT CẢ ĐƠN HÀNG ======================= */
exports.getAllOrders = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, order_service_1.getAllOrdersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
/* ======================= STRIPE KEY ======================= */
exports.sendStripePublishableKey = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res) => {
    res.status(200).json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});
/* ======================= TẠO PAYMENT ======================= */
exports.newPayment = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});

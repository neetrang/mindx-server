"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const error_1 = require("./middleware/error");
exports.app = (0, express_1.default)();
const user_route_1 = __importDefault(require("./routes/user.route"));
const course_route_1 = __importDefault(require("./routes/course.route"));
const order_route_1 = __importDefault(require("./routes/order.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const analytics_route_1 = __importDefault(require("./routes/analytics.route"));
const layout_route_1 = __importDefault(require("./routes/layout.route"));
const express_rate_limit_1 = require("express-rate-limit");
require('dotenv').config();
//cookie parser
exports.app.use((0, cookie_parser_1.default)());
//body parser
exports.app.use(express_1.default.json({ limit: "50mb" }));
//cors cross origin resource sharing
exports.app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'https://my-learning-7z285loy0-sujals-projects-d94254e2.vercel.app', 'https://my-learning-sigma.vercel.app'],
    credentials: true,
}));
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc. See below.
});
// Apply the rate limiting middleware to all requests.
exports.app.use(limiter);
//testing api
exports.app.use('/api/v1', user_route_1.default);
exports.app.use('/api/v1', course_route_1.default);
exports.app.use('/api/v1', order_route_1.default);
exports.app.use('/api/v1', notification_route_1.default);
exports.app.use('/api/v1', analytics_route_1.default);
exports.app.use('/api/v1', layout_route_1.default);
exports.app.get('/test', (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'testing api'
    });
});
//unknown route 
exports.app.all("*", (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.status = 404;
    next(err);
});
exports.app.use(limiter);
exports.app.use(error_1.ErrorMiddleware);
//mongodb+srv://vermasujal16:<db_password>@lms.akoq2.mongodb.net/

import express , {NextFunction,Response,Request} from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ErrorMiddleware } from './middleware/error';
export const app=express();
import userRouter from './routes/user.route'
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import notificationRoute from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';
import layoutRouter from './routes/layout.route';
import { rateLimit } from 'express-rate-limit'

require('dotenv').config();


//cookie parser
app.use(cookieParser());

//body parser
app.use(express.json({limit:"50mb"}));
//cors cross origin resource sharing
app.use(
    cors({
        origin: ['http://localhost:3000', 'https://my-learning-7z285loy0-sujals-projects-d94254e2.vercel.app','https://my-learning-sigma.vercel.app'],
        credentials: true,
    })
);
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	// store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)
//testing api
app.use('/api/v1',userRouter)
app.use('/api/v1',courseRouter)
app.use('/api/v1',orderRouter)
app.use('/api/v1',notificationRoute)
app.use('/api/v1',analyticsRouter)
app.use('/api/v1',layoutRouter)
app.get('/test',(req:Request,res:Response,next:NextFunction)=>{
    res.status(200).json({
        success:true,
        message:'testing api'
    })
})
//unknown route 
 
app.all("*",(req:Request,res:Response,next:NextFunction)=>{
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.status = 404;
    next(err);
})

app.use(limiter)

app.use(ErrorMiddleware)
//mongodb+srv://vermasujal16:<db_password>@lms.akoq2.mongodb.net/

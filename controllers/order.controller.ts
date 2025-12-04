import {NextFunction, Request,Response } from 'express';
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel, { ICourse } from '../models/course.model';
import { getAllOrdersService, newOrder } from '../services/order.service';
import path from 'path';
import ejs from 'ejs';
import sendMail from '../utils/sendMail';
import NotificationModel from '../models/notification.model';
import { redis } from '../utils/redis';


export const createOrder = CatchAsyncError(async(req:Request,res:Response,next:NextFunction)=>{
    try{
        const {courseId} = req.body as IOrder;
        const user = await userModel.findById(req.user?._id);
        const courseExistInUser = user?.courses.some(
            (course: any) => course._id.toString() === courseId
          );
    
          if (courseExistInUser) {
            return next(
              new ErrorHandler("You have already purchased this course", 400)
            );
          }

        const course = await CourseModel.findById(courseId);
        if(!course){
            return next(new ErrorHandler("Invalid course id",404));
        }
        const data:any={
            courseId: course._id,
            userId: user?._id,
        }
        
        const mailData={
            order:{
                _id : course._id,
                name:course.name,
                price:course.price,
                date : new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
            }
        }
        const html = await ejs.renderFile(path.join(__dirname, '../mails/order-confirmation.ejs'),mailData);

        try {
            if(user){
                await sendMail({
                    email: user.email,
                    subject:"Order Confirmation",
                    template:"order-confirmation.ejs",
                    data:mailData
                });
            }
            
        } catch (error:any) {
            return next(new ErrorHandler(error.message,500))
        }
        const courseid:any=course?._id;
        user?.courses.push(courseid);
        await redis.set(req.user?._id,JSON.stringify(user));
        await user?.save();
         await NotificationModel.create({
            user:user?._id,
            title:"New Order",
            message:`You have a new order from ${course?.name}`,
        });
        course.purchased +=1;
        await course.save();
        newOrder(data,res,next);
    }
    catch(error:any){
        return next(new ErrorHandler(error.message,400));
    }

})

export const getAllOrders = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        getAllOrdersService(res);
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  ); 



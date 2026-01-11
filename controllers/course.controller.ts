import {NextFunction, Request, Response } from 'express';
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import cloudinary from 'cloudinary';
import { createCourse, getAllCoursesService } from '../services/course.service';
import CourseModel from '../models/course.model';
import { redis } from '../utils/redis';
import mongoose from 'mongoose';
import ejs from 'ejs'
import path from 'path'
import sendMail from '../utils/sendMail';
import NotificationModel from '../models/notification.model';
import axios from 'axios'

// Upload khóa học
export const uploadCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
          const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
            folder: "courses",
          });
          data.thumbnail = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
        createCourse(data, res, next);
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  );

// Sửa khóa học
export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      const courseId = req.params.id;
      const courseData = await CourseModel.findById(courseId) as any;

      if (thumbnail && !thumbnail.startsWith("https")) {
        await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, { folder: "courses" });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      if (thumbnail.startsWith("https")) {
        data.thumbnail = {
          public_id: courseData?.thumbnail.public_id,
          url: courseData?.thumbnail.url,
        };
      }

      const course = await CourseModel.findByIdAndUpdate(courseId, { $set: data }, { new: true });
      await redis.set(courseId, JSON.stringify(course)); // cập nhật khóa học trong redis
      res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Lấy 1 khóa học (không cần mua)
export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction)=>{
  try{
    const courseId = req.params.id;
    const isCacheExist = await redis.get(courseId);
    if(isCacheExist){
      const course = JSON.parse(isCacheExist);
      res.status(200).json({
        success:true,
        course
      })
    }
    else{
      const course = await CourseModel.findById(req.params.id)
        .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
      await redis.set(courseId, JSON.stringify(course),'EX',604800); // cập nhật khóa học trong redis 7 ngày
      res.status(200).json({
        success:true,
        course
      })
    }
  }
  catch(error:any){
    return next(new ErrorHandler(error.message,500));
  }
})

// Lấy tất cả khóa học (không cần mua)
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await CourseModel.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Lấy khóa học của người dùng đã mua
export const getCourseByUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction)=>{
  try{
    const getUserCourseList = req.user?.courses;
    const courseId = req.params.id;
    const courseExists = getUserCourseList?.find((course:any)=> course._id.toString()===courseId);
    if(!courseExists){
      return next(new ErrorHandler("Bạn không có quyền truy cập khóa học này",404));
    }
    const course  = await CourseModel.findById(courseId);
    const content = course?.courseData;
    res.status(200).json({
      success:true,
      content,
    });
  }
  catch(error:any){
    return next(new ErrorHandler(error.message,500));
  }
})

// Thêm câu hỏi vào khóa học
interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}
export const addQuestion=CatchAsyncError(async (req:Request,res:Response,next:NextFunction) =>{
  try{
    const {question, courseId, contentId} = req.body as IAddQuestionData;
    const course = await CourseModel.findById(courseId);
    if(!mongoose.Types.ObjectId.isValid(contentId)){
      return next(new ErrorHandler("ID nội dung không hợp lệ",400))
    }
    const courseContent = course?.courseData?.find((item:any)=>item._id.equals(contentId));
    if(!courseContent){
      return next(new ErrorHandler("ID nội dung không hợp lệ",400))
    }
    const newQuestion:any = {
      user:req.user,
      question,
      questionReplies:[],
    }
    courseContent.questions.push(newQuestion);
    await NotificationModel.create({
      user:req.user?._id,
      title:"Câu hỏi mới",
      message:`Có câu hỏi mới trong khóa học ${course?.name}`,
    })
    await course?.save();
    res.status(201).json({
      success:true,
      course
    });
  }
  catch(error:any){
    return next(new ErrorHandler(error.message,500));
  }
});

// Thêm trả lời vào câu hỏi
interface IAddAnswerData {
  answer: string;
  questionId: string;
  courseId: string;
  contentId: string;
}
export const addAnswer=CatchAsyncError(async (req:Request,res:Response,next:NextFunction) =>{
  try {
    const {answer, courseId, contentId,questionId} = req.body as IAddAnswerData;
    const course = await CourseModel.findById(courseId);
    if(!mongoose.Types.ObjectId.isValid(contentId)){
      return next(new ErrorHandler("ID nội dung không hợp lệ",400))
    }
    const courseContent = course?.courseData?.find((item:any)=>item._id.equals(contentId));
    if(!courseContent){
      return next(new ErrorHandler("ID nội dung không hợp lệ",400))
    }
    const question = courseContent.questions.find((item:any)=> item._id.equals(questionId));
    if(!question){
      return next(new ErrorHandler("ID câu hỏi không hợp lệ",400))
    }
    const newAnswer:any = {
      user: req.user,
      answer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    question.questionReplies.push(newAnswer);
    await course?.save();
    if(req.user?._id === question.user._id){
      await NotificationModel.create({
        user:req.user?._id,
        title:"Trả lời câu hỏi mới",
        message:`Có trả lời mới cho câu hỏi của bạn trong khóa học ${courseContent?.title}`,
      })
    }
    else{
      const data = { name: question.user.name, title:courseContent.title }
      const html = await ejs.renderFile(path.join(__dirname,"../mails/question-reply.ejs"),data);
      try {
        await sendMail({
          email:question.user.email,
          subject: "Trả lời câu hỏi",
          template:"question-reply.ejs",
          data,
        })
      } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
      }
    }
    res.status(200).json({
      success:true,
      course
    });
    
  } catch (error:any) {
    return next(new ErrorHandler(error.message,500))
  }
});

// Thêm đánh giá vào khóa học
interface IAddReviewData {
  review: string;
  courseId: string;
  rating:number;
  userId:string;
}
export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      const courseExists = userCourseList?.some(
        (course: any) => course._id.toString() === courseId.toString()
      );
      if (!courseExists) {
        return next(
          new ErrorHandler("Bạn không có quyền đánh giá khóa học này", 404)
        );
      }
      const course = await CourseModel.findById(courseId);
      const { review, rating } = req.body as IAddReviewData;
      const reviewData: any = { user: req.user, rating, comment: review };
      course?.reviews.push(reviewData);

      let avg = 0;
      course?.reviews.forEach((rev: any) => { avg += rev.rating; });
      if (course) { course.ratings = avg / course.reviews.length; }

      await course?.save();
      await redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7 ngày
      await NotificationModel.create({
        user: req.user?._id,
        title: "Đánh giá mới",
        message: `${req.user?.name} đã đánh giá khóa học ${course?.name}`,
      });

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Trả lời đánh giá
interface IAddReviewReplyData {
  comment: string;
  courseId: string;
  reviewId: string;
}
export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewReplyData;
      const course = await CourseModel.findById(courseId);
      if (!course) return next(new ErrorHandler("Khóa học không tồn tại", 404));
      const review = course?.reviews?.find((rev: any) => rev._id.toString() === reviewId);
      if (!review) return next(new ErrorHandler("Đánh giá không tồn tại", 404));

      const replyData: any = { user: req.user, comment, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if(!review.commentReplies) review.commentReplies = [];
      review.commentReplies?.push(replyData);

      await course?.save();
      await redis.set(courseId, JSON.stringify(course), "EX", 604800);

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Lấy tất cả khóa học cho admin
export const getAdminAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try { getAllCoursesService(res); } 
    catch (error: any) { return next(new ErrorHandler(error.message, 400)); }
  }
);

// Xóa khóa học
export const deleteCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await CourseModel.findById(id);
      if (!course) return next(new ErrorHandler("Khóa học không tồn tại", 404));
      await course.deleteOne({ id });
      await redis.del(id);
      res.status(200).json({ success: true, message: "Khóa học đã được xóa" });  
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Tạo URL video
export const generateVideoUrl = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.body;
      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
          },
        }
      );
      res.json(response.data);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

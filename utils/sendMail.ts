require("dotenv").config();

import { Resend } from "resend";
import ejs from "ejs";
import path from "path";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

// khởi tạo resend
const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (options: EmailOptions): Promise<void> => {
  try {
    const { email, subject, template, data } = options;

    // đường dẫn tới file ejs
    const templatePath = path.join(__dirname, "../mails", template);

    // render html từ ejs
    const html: string = await ejs.renderFile(templatePath, data);

    // gửi mail bằng resend
    const response = await resend.emails.send({
      from: "MindX <onboarding@resend.dev>",
      to: email,
      subject: subject,
      html: html,
    });

    console.log("✅ Email sent successfully:", response);

  } catch (error) {
    console.error("❌ Send mail error:", error);
    throw error;
  }
};

export default sendMail;
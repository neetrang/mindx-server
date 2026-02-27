require("dotenv").config();
import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const sendMail = async (options: EmailOptions): Promise<void> => {

  const transporter: Transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { email, subject, template, data } = options;

  const templatePath = path.join(__dirname, "../mails", template);

  const html: string = await ejs.renderFile(templatePath, data);

  const mailOption = {
    from: `"MindX" <${process.env.SMTP_MAIL}>`,
    to: email,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOption);
    console.log("✅ EMAIL SENT SUCCESS");
  } catch (error) {
    console.error("❌ EMAIL ERROR:", error);
  }
};

export default sendMail;
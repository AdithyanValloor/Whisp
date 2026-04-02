//mailer.ts

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // or your SMTP provider
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // app password, not your real password
  },
});

export const sendOtpEmail = async (email: string, otp: string) => {
  await transporter.sendMail({
    from: `"Convy" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Your verification code",
    html: `
      <p>Your OTP is <strong>${otp}</strong>.</p>
      <p>It expires in 10 minutes. Do not share it with anyone.</p>
    `,
  });
};
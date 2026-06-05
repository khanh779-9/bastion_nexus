/**
 * Bastion Nexus — Mail Utility
 * Gửi email qua SMTP (fix từ CommonJS sang ESM/TypeScript)
 */
import nodemailer from 'nodemailer';
import type { MailOptions } from '../types/index.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.example.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
});

export async function sendMail({ to, subject, text, html }: MailOptions): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM ?? 'no-reply@bastion-nexus.app',
    to,
    subject,
    text,
    html,
  };
  await transporter.sendMail(mailOptions);
}

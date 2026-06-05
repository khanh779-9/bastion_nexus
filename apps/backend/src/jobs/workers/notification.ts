import { Worker } from 'bullmq';
import { sendMail } from '../../utils/mail.js';
import { redisConnection } from '../../lib/bullmq.js';

export const notificationWorker = new Worker(
  'notification-email',
  async (job) => {
    const { to, subject, text, html } = job.data;
    console.log(`[Worker] Gửi email đến ${to}...`);
    try {
      await sendMail({ to, subject, text, html });
      console.log(`[Worker] Gửi email thành công tới ${to}`);
    } catch (e: any) {
      console.error(`[Worker] Gửi email tới ${to} thất bại:`, e.message);
      throw e; // throw error to allow BullMQ retry
    }
  },
  { connection: redisConnection }
);

console.log('[Worker] Notification email worker initialized');

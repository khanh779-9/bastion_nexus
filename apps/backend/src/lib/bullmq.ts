/**
 * Bastion Nexus — BullMQ Setup
 * Queue definitions + connection config
 */
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { config } from '../config/index.js';

/** Parse Redis URL thành BullMQ connection options */
function parseRedisConnection(): ConnectionOptions {
  const url = new URL(config.redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}

export const redisConnection = parseRedisConnection();

// ─── Queue Definitions ───

export const breachCheckQueue = new Queue('breach-check', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const notificationQueue = new Queue('notification-email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
});

/** Thêm job kiểm tra breach */
export async function addBreachCheckJob(data: {
  monitorId: number;
  value: string;
  userId: number;
}): Promise<void> {
  await breachCheckQueue.add('check', data, {
    jobId: `breach-${data.monitorId}-${Date.now()}`,
  });
}

/** Thêm job gửi email notification */
export async function addNotificationJob(data: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  await notificationQueue.add('send-email', data);
}

/** Đóng tất cả queues */
export async function closeQueues(): Promise<void> {
  await breachCheckQueue.close();
  await notificationQueue.close();
}

/**
 * Bastion Nexus — Breach Check Worker
 * Xử lý kiểm tra rò rỉ dữ liệu nền
 */
import { Worker } from 'bullmq';
import axios from 'axios';
import prisma from '../../lib/prisma.js';
import { redisConnection } from '../../lib/bullmq.js';
import { cacheGet, cacheSet } from '../../lib/redis.js';
import { emitBreachAlert } from '../../lib/socket.js';
import { config } from '../../config/index.js';
import { hashData } from '../../utils/encryption.js';

interface BreachCheckJob {
  monitorId: number;
  value: string;
  userId: number;
}

interface BreachCheckResult {
  breached: boolean;
  breachSource?: string;
  breachDate?: string;
  rawData?: Record<string, unknown>;
}

async function checkBreach(value: string): Promise<BreachCheckResult> {
  // Kiểm tra cache trước
  const cacheKey = `breach:${hashData(value)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return JSON.parse(cached) as BreachCheckResult;
  }

  if (!config.hibpApiKey) {
    // Chế độ giả lập khi không có API key
    const result: BreachCheckResult = value.includes('pwned')
      ? {
          breached: true,
          breachSource: 'Simulated Breach (HIBP)',
          breachDate: new Date().toISOString(),
          rawData: {
            Title: 'Adobe',
            Domain: 'adobe.com',
            BreachDate: '2013-10-04',
            Description: 'Simulated breach for testing.',
          },
        }
      : { breached: false };

    await cacheSet(cacheKey, JSON.stringify(result), 86400); // 24h
    return result;
  }

  // Gọi HIBP API thật
  try {
    const encoded = encodeURIComponent(value);
    const response = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encoded}?truncateResponse=false`,
      {
        headers: {
          'hibp-api-key': config.hibpApiKey,
          'user-agent': 'Bastion-Nexus',
        },
      },
    );

    if (response.data?.length > 0) {
      const latest = response.data[0];
      const result: BreachCheckResult = {
        breached: true,
        breachSource: latest.Title,
        breachDate: latest.BreachDate,
        rawData: latest,
      };
      await cacheSet(cacheKey, JSON.stringify(result), 86400);
      return result;
    }

    const safeResult: BreachCheckResult = { breached: false };
    await cacheSet(cacheKey, JSON.stringify(safeResult), 86400);
    return safeResult;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number } };
    if (axiosError.response?.status === 404) {
      const safeResult: BreachCheckResult = { breached: false };
      await cacheSet(cacheKey, JSON.stringify(safeResult), 86400);
      return safeResult;
    }
    throw error;
  }
}

export function startBreachCheckWorker(): Worker {
  const worker = new Worker<BreachCheckJob>(
    'breach-check',
    async (job) => {
      const { monitorId, value, userId } = job.data;
      console.log(`[BreachWorker] Checking monitor ${monitorId}...`);

      const result = await checkBreach(value);

      // Lưu kết quả vào DB
      await prisma.breachResult.create({
        data: {
          monitorId,
          breached: result.breached,
          breachSource: result.breachSource ?? null,
          breachDate: result.breachDate ? new Date(result.breachDate) : null,
          rawData: result.rawData ? (result.rawData as object) : undefined,
        },
      });

      // Emit realtime alert nếu bị breach
      if (result.breached) {
        emitBreachAlert(userId, {
          monitorId,
          breachSource: result.breachSource,
          breachDate: result.breachDate,
        });
      }

      return result;
    },
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`[BreachWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BreachWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

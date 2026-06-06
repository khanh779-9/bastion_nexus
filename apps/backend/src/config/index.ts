/**
 * Bastion Nexus — Config
 */
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  jwtSecret: process.env.JWT_SECRET ?? 'devsecret',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3000',
  runMigrations: process.env.RUN_MIGRATIONS === 'true',

  // Redis
  redisUrl: process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379',

  // BullMQ
  bullBoardEnabled: process.env.BULL_BOARD_ENABLED === 'true',

  // HIBP
  hibpApiKey: process.env.HIBP_API_KEY ?? '',
} as const;


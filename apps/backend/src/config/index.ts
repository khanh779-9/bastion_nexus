/**
 * Bastion Nexus — Config
 */
import dotenv from 'dotenv';

dotenv.config();

function getPortFromUrl(urlStr: string, defaultPort: number): number {
  try {
    const parsed = new URL(urlStr);
    return parsed.port ? parseInt(parsed.port, 10) : defaultPort;
  } catch {
    return defaultPort;
  }
}

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

export const config = {
  port: getPortFromUrl(backendUrl, 3000),
  dbUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'devsecret',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  backendUrl,
  runMigrations: process.env.RUN_MIGRATIONS === 'true',

  // Redis
  redisUrl: process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379',

  // Socket.IO
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN ?? 'http://localhost:5173',

  // BullMQ
  bullBoardEnabled: process.env.BULL_BOARD_ENABLED === 'true',

  // HIBP
  hibpApiKey: process.env.HIBP_API_KEY ?? '',
} as const;

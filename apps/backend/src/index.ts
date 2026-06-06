import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';

import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';
import { initSocketIO } from './lib/socket.js';
import { swaggerSpec } from './config/swagger.js';
import swaggerUi from 'swagger-ui-express';
import { rateLimit } from './middleware/rateLimit.js';

// Routes
import authRoutes from './routes/auth.js';
import vaultRoutes from './routes/vault.js';
import notesRoutes from './routes/notes.js';
import userRoutes from './routes/user.js';
import breachRoutes from './routes/breach.js';
import walletRoutes from './routes/wallet.js';

import { getDashboardHtml } from './utils/dashboard.js';

const app = express();
const server = createServer(app);

// Init Socket.IO (only if not running in a Vercel serverless environment)
if (!process.env.VERCEL) {
  initSocketIO(server);
}

// CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Security
if (config.frontendUrl && config.frontendUrl !== '*') {
  app.use(helmet());
}

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(morgan('combined'));

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// API Routes
app.use('/api/auth', rateLimit('auth'), authRoutes);
app.use('/api/vault', rateLimit('api'), vaultRoutes);
app.use('/api/notes', rateLimit('api'), notesRoutes);
app.use('/api/user', rateLimit('api'), userRoutes);
app.use('/api/breach', rateLimit('api'), breachRoutes);
app.use('/api/wallet', rateLimit('api'), walletRoutes);

// Static files
app.use(express.static(path.join(process.cwd(), 'public')));

// Dashboard root
app.get('/', async (_req, res) => {
  try {
    const html = await getDashboardHtml();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err: any) {
    console.error('Failed to generate dashboard:', err);
    res.status(500).send('Internal Server Error');
  }
});

// 404 fallback
app.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled API Error]', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
  });

  if (res.headersSent) return next(err);

  res.status(err?.status || 500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully via Prisma');

    if (config.runMigrations) {
      console.log('🔄 Running database migrations...');
      const { execSync } = await import('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations applied');
    }
  } catch (e: any) {
    console.error('⚠️ Database connection failed:', e.message);
    console.warn('Server starting anyway for debugging...');
  }

  // Load and start BullMQ Workers only for persistent server environment (non-Vercel)
  try {
    console.log('🔄 Loading BullMQ workers...');
    const { startBreachCheckWorker } = await import('./jobs/workers/breachCheck.js');
    await import('./jobs/workers/notification.js');
    startBreachCheckWorker();
    console.log('✅ BullMQ workers loaded and started');
  } catch (workerError: any) {
    console.error('⚠️ Failed to initialize BullMQ workers:', workerError.message);
  }

  server.listen(config.port, () => {
    console.log(`🚀 Bastion Nexus API listening on ${config.backendUrl}`);
    console.log(`📄 Swagger docs at ${config.backendUrl}/api-docs`);
  });
}

// Only start the HTTP listener if NOT running in a Vercel serverless environment.
// On Vercel, requests are routed directly to the exported 'app' handler.
if (!process.env.VERCEL) {
  start().catch((e) => {
    console.error('Failed to start server:', e);
    process.exit(1);
  });
}

// Global process handlers
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
});

export default app;

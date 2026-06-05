import express, { type Request, type Response, type NextFunction } from 'express';
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

// Khởi chạy BullMQ workers
import './jobs/workers/breachCheck.js';
import './jobs/workers/notification.js';

// Route Imports
import authRoutes from './routes/auth.js';
import vaultRoutes from './routes/vault.js';
import notesRoutes from './routes/notes.js';
import userRoutes from './routes/user.js';
import breachRoutes from './routes/breach.js';
import walletRoutes from './routes/wallet.js';

const app = express();
const server = createServer(app);

// Khởi tạo Socket.IO
initSocketIO(server);

// Security Middleware
const allowAll = !config.frontendUrl || config.frontendUrl === '*';
if (!allowAll) {
  app.use(helmet());
}
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Swagger documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// API Endpoints
app.use('/api/auth', rateLimit('auth'), authRoutes);
app.use('/api/vault', rateLimit('api'), vaultRoutes);
app.use('/api/notes', rateLimit('api'), notesRoutes);
app.use('/api/user', rateLimit('api'), userRoutes);
app.use('/api/breach', rateLimit('api'), breachRoutes);
app.use('/api/wallet', rateLimit('api'), walletRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled API Error]', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err?.status || 500).json({ error: 'Internal server error' });
});

// Start Function
async function start() {
  try {
    // Check DB Connection
    await prisma.$connect();
    console.log('✅ Database connected successfully via Prisma');
  } catch (e: any) {
    console.error('⚠️ Database connection failed:', e.message);
    console.warn('Server starting despite DB connection error for debugging...');
  }

  // Serve static assets from public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

  // API root instructions
  app.get('/', (_req, res) => {
    res.json({
      message: 'Welcome to Bastion Nexus API!',
      endpoints: {
        auth: {
          register: {
            method: 'POST',
            path: '/api/auth/register',
            body: { email: 'user@example.com', password: 'yourPassword' }
          },
          login: {
            method: 'POST',
            path: '/api/auth/login',
            body: { email: 'user@example.com', password: 'yourPassword' }
          },
          logout: { method: 'POST', path: '/api/auth/logout' },
          me: { method: 'GET', path: '/api/auth/me' }
        },
        vault: {
          list: { method: 'GET', path: '/api/vault/items' },
          create: {
            method: 'POST',
            path: '/api/vault/items',
            body: { name: 'My Vault', type: 'website', username: 'user', password: 'password' }
          },
          get: { method: 'GET', path: '/api/vault/items/:id' },
          update: { method: 'PUT', path: '/api/vault/items/:id' },
          delete: { method: 'DELETE', path: '/api/vault/items/:id' }
        },
        notes: {
          list: { method: 'GET', path: '/api/notes' },
          create: { method: 'POST', path: '/api/notes', body: { title: 'Note title', content: 'Note content' } },
          get: { method: 'GET', path: '/api/notes/:id' },
          update: { method: 'PUT', path: '/api/notes/:id' },
          delete: { method: 'DELETE', path: '/api/notes/:id' }
        },
        wallet: {
          list: { method: 'GET', path: '/api/wallet/items' },
          create: { method: 'POST', path: '/api/wallet/items', body: { name: 'My Wallet', wallet_type: 'crypto', secret: 'secret_key' } },
          get: { method: 'GET', path: '/api/wallet/items/:id' },
          update: { method: 'PUT', path: '/api/wallet/items/:id' },
          delete: { method: 'DELETE', path: '/api/wallet/items/:id' }
        }
      },
      documentation: '/api-docs'
    });
  });

  // Fallback 404
  app.get('*', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  server.listen(config.port, () => {
    console.log(`🚀 Bastion Nexus API listening on ${config.backendUrl}`);
    console.log(`📄 API Swagger documentation available at ${config.backendUrl}/api-docs`);
  });
}

start().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
});

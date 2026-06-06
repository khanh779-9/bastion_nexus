/**
 * Bastion Nexus — Socket.IO Server
 * Realtime notifications + chat namespace (placeholder)
 */
import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { getRedis } from './redis.js';
import { config } from '../config/index.js';

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO chưa được khởi tạo');
  return io;
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter cho horizontal scaling
  try {
    const pubClient = getRedis().duplicate();
    const subClient = getRedis().duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket.IO] Redis adapter configured');
  } catch (err) {
    console.warn('[Socket.IO] Redis adapter failed, using default:', (err as Error).message);
  }

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Namespace: Notifications ──
  const notificationsNs = io.of('/notifications');
  notificationsNs.on('connection', (socket) => {
    const userId = socket.data.userId as number;
    // Mỗi user join room riêng
    socket.join(`user:${userId}`);
    console.log(`[Socket.IO] User ${userId} connected to /notifications`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${userId} disconnected from /notifications`);
    });
  });

  // ── Namespace: Chat (placeholder) ──
  const chatNs = io.of('/chat');
  chatNs.on('connection', (socket) => {
    const userId = socket.data.userId as number;
    socket.join(`user:${userId}`);
    console.log(`[Socket.IO] User ${userId} connected to /chat`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${userId} disconnected from /chat`);
    });
  });

  console.log('[Socket.IO] Server initialized');
  return io;
}

/** Gửi thông báo realtime tới user */
export function emitNotification(userId: number, data: Record<string, unknown>): void {
  if (!io) return;
  io.of('/notifications').to(`user:${userId}`).emit('notification:new', data);
}

/** Gửi cảnh báo breach realtime */
export function emitBreachAlert(userId: number, data: Record<string, unknown>): void {
  if (!io) return;
  io.of('/notifications').to(`user:${userId}`).emit('breach:alert', data);
}

/**
 * Bastion Nexus — Prisma Client Singleton
 * Bao gồm extension tự động mã hóa/giải mã fields nhạy cảm
 */
import { PrismaClient } from '@prisma/client';
import { encryptSensitive, decryptSensitive } from '../utils/encryption.js';

// Cấu hình fields cần mã hóa theo model
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  VaultItem: ['name', 'username', 'email', 'password', 'otpSecret', 'description'],
  Note: ['title', 'content'],
  BreachMonitor: ['monitorValue'],
  WalletItem: ['walletType', 'name', 'address', 'description'],
};

/** Giải mã an toàn — trả về nguyên bản nếu không decrypt được */
function safeDecrypt(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return value as string | null;
  try {
    if (value.includes(':') && value.split(':').length === 3) {
      return decryptSensitive(value);
    }
    return value;
  } catch {
    return value;
  }
}

/** Mã hóa field nếu có giá trị */
function safeEncrypt(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return value as string | null;
  return encryptSensitive(value);
}

/** Decrypt một object theo config fields */
function decryptRecord(model: string, record: Record<string, unknown>): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !record) return record;

  const result = { ...record };
  for (const field of fields) {
    if (field in result && result[field] != null) {
      result[field] = safeDecrypt(result[field]);
    }
  }
  return result;
}

/** Encrypt data trước khi write */
function encryptData(model: string, data: Record<string, unknown>): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data) return data;

  const result = { ...data };
  for (const field of fields) {
    if (field in result && result[field] != null) {
      result[field] = safeEncrypt(result[field]);
    }
  }
  return result;
}

// Singleton pattern
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

// Extension với auto encrypt/decrypt
export const prisma = basePrisma.$extends({
  name: 'encryption',
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (args.data && ENCRYPTED_FIELDS[model]) {
          args.data = encryptData(model, args.data as Record<string, unknown>) as any;
        }
        const result = await query(args);
        if (result && ENCRYPTED_FIELDS[model]) {
          return decryptRecord(model, result as Record<string, unknown>);
        }
        return result;
      },
      async createMany({ model, args, query }) {
        if (args.data && ENCRYPTED_FIELDS[model]) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((d) => encryptData(model, d as Record<string, unknown>)) as any;
          } else {
            args.data = encryptData(model, args.data as Record<string, unknown>) as any;
          }
        }
        return query(args);
      },
      async update({ model, args, query }) {
        if (args.data && ENCRYPTED_FIELDS[model]) {
          args.data = encryptData(model, args.data as Record<string, unknown>) as any;
        }
        const result = await query(args);
        if (result && ENCRYPTED_FIELDS[model]) {
          return decryptRecord(model, result as Record<string, unknown>);
        }
        return result;
      },
      async upsert({ model, args, query }) {
        if (ENCRYPTED_FIELDS[model]) {
          if (args.create) args.create = encryptData(model, args.create as Record<string, unknown>) as any;
          if (args.update) args.update = encryptData(model, args.update as Record<string, unknown>) as any;
        }
        const result = await query(args);
        if (result && ENCRYPTED_FIELDS[model]) {
          return decryptRecord(model, result as Record<string, unknown>);
        }
        return result;
      },
      async findFirst({ model, args, query }) {
        const result = await query(args);
        if (result && ENCRYPTED_FIELDS[model]) {
          return decryptRecord(model, result as Record<string, unknown>);
        }
        return result;
      },
      async findUnique({ model, args, query }) {
        const result = await query(args);
        if (result && ENCRYPTED_FIELDS[model]) {
          return decryptRecord(model, result as Record<string, unknown>);
        }
        return result;
      },
      async findMany({ model, args, query }) {
        const results = await query(args);
        if (Array.isArray(results) && ENCRYPTED_FIELDS[model]) {
          return results.map((r) => decryptRecord(model, r as Record<string, unknown>));
        }
        return results;
      },
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;
export default prisma;

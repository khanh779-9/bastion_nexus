/**
 * Bastion Nexus — Audit Logging (Prisma)
 */
import prisma from '../lib/prisma.js';
import type { Request } from 'express';
import type { AuditAction } from '../types/index.js';

export async function logAuditAction(
  userId: number | null,
  action: AuditAction,
  resourceType: string,
  resourceId: string | number,
  details: Record<string, unknown> = {},
  req?: Request,
): Promise<void> {
  try {
    const ipAddress = req?.ip ?? req?.socket?.remoteAddress ?? 'unknown';
    const userAgent = req?.headers?.['user-agent'] ?? 'unknown';

    await prisma.auditLog.create({
      data: {
        accountId: userId,
        action,
        resourceType,
        resourceId: String(resourceId),
        details: details as object,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    // Không throw — lỗi ghi log không nên ảnh hưởng app
  }
}

export { AUDIT_ACTIONS } from '../types/index.js';

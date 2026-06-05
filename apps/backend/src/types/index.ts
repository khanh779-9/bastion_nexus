/**
 * Bastion Nexus — Shared Types
 */
import type { Request } from 'express';

/** Request đã xác thực JWT — có thông tin user */
export type AuthRequest = any;

/** Response API chuẩn */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success?: boolean;
}

/** Thông tin User-Agent đã parse */
export interface UserAgentInfo {
  browser: string;
  os: string;
  device: string;
}

/** Cấu hình mail */
export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Audit log actions */
export const AUDIT_ACTIONS = {
  // Auth
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  FAILED_LOGIN: 'FAILED_LOGIN',

  // Vault
  VAULT_ITEM_CREATED: 'VAULT_ITEM_CREATED',
  VAULT_ITEM_UPDATED: 'VAULT_ITEM_UPDATED',
  VAULT_ITEM_DELETED: 'VAULT_ITEM_DELETED',
  VAULT_ITEM_VIEWED: 'VAULT_ITEM_VIEWED',

  // Notes
  NOTE_CREATED: 'NOTE_CREATED',
  NOTE_UPDATED: 'NOTE_UPDATED',
  NOTE_DELETED: 'NOTE_DELETED',
  NOTE_SHARED: 'NOTE_SHARED',
  NOTE_SHARE_REVOKED: 'NOTE_SHARE_REVOKED',

  // Security
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  DEVICE_TRUST_CHANGED: 'DEVICE_TRUST_CHANGED',
  TWO_FA_ENABLED: '2FA_ENABLED',
  TWO_FA_DISABLED: '2FA_DISABLED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

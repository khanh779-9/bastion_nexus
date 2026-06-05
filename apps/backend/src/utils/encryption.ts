/**
 * Bastion Nexus — Data Encryption Utilities
 * AES-256-GCM mã hóa/giải mã dữ liệu nhạy cảm
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex' as const;

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? 'devsecret';
  if (process.env.ENCRYPTION_KEY) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    if (key.length === 32) return key;
  }
  return crypto.scryptSync(secret, 'bastion-nexus-salt', 32);
}

const ENCRYPTION_KEY = getEncryptionKey();

/** Mã hóa dữ liệu nhạy cảm (passwords, OTP secrets, v.v.) */
export function encryptSensitive(data: string): string {
  if (!data) return data;

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(data, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Data encryption failed');
  }
}

/** Giải mã dữ liệu */
export function decryptSensitive(encrypted: string): string {
  if (!encrypted) return encrypted;

  try {
    const [ivHex, authTagHex, encryptedData] = encrypted.split(':');

    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Data decryption failed');
  }
}

/** Hash một chiều dùng SHA-256 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** Tạo token ngẫu nhiên an toàn */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

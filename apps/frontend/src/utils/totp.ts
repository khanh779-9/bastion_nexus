/**
 * TOTP (Time-based One-Time Password) Generator
 * RFC 6238 compliant
 */

export function generateTOTP(
  secret: string | null | undefined, 
  epochSeconds = Math.floor(Date.now() / 1000)
): Promise<string | null> | null {
  if (!secret) return null;
  try {
    // Use 30-second time step (RFC 6238 standard)
    let timeCounter = Math.floor(epochSeconds / 30);
    
    // Proper base32 decoding
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const secret_upper = secret.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    
    for (let i = 0; i < secret_upper.length; i++) {
      const idx = base32chars.indexOf(secret_upper[i]);
      if (idx === -1) return null;
      
      value = (value << 5) | idx;
      bits += 5;
      
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 0xff);
      }
    }
    
    // Create counter as 8-byte big-endian
    const counter = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      counter[i] = timeCounter & 0xff;
      timeCounter >>= 8;
    }
    
    // Use Web Crypto API for HMAC-SHA1
    const crypto = window.crypto;
    const key = new Uint8Array(bytes);
    
    return crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
      .then(k => crypto.subtle.sign('HMAC', k, counter))
      .then(sig => {
        const arr = new Uint8Array(sig);
        const offset = arr[arr.length - 1] & 0xf;
        const code = ((arr[offset] & 0x7f) << 24) | ((arr[offset + 1] & 0xff) << 16) | 
                     ((arr[offset + 2] & 0xff) << 8) | (arr[offset + 3] & 0xff);
        return (code % 1000000).toString().padStart(6, '0');
      })
      .catch(() => null);
  } catch (e) {
    return null;
  }
}

/**
 * Bastion Nexus — User-Agent Parser
 */
import type { UserAgentInfo } from '../types/index.js';

export function parseUserAgent(ua: string): UserAgentInfo {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Unknown';

  // Browser detection
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios|crmo/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'IE';

  // OS detection
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.2/i.test(ua)) os = 'Windows 8';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/android\s?([\d.]+)?/i.test(ua)) {
    const match = ua.match(/android\s?([\d.]+)?/i);
    os = match?.[1] ? `Android ${match[1]}` : 'Android';
  } else if (/iphone/i.test(ua)) os = 'iOS (iPhone)';
  else if (/ipad/i.test(ua)) os = 'iOS (iPad)';
  else if (/mac os x ([\d_]+)/i.test(ua)) {
    const match = ua.match(/mac os x ([\d_]+)/i);
    os = match?.[1] ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/linux/i.test(ua)) os = 'Linux';
  else if (/x11/i.test(ua)) os = 'Unix';

  // Device detection
  if (/mobile/i.test(ua) || /iphone|ipod|android.*mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) device = 'Tablet';
  else device = 'Desktop';

  return { browser, os, device };
}

import os from 'os';
import { prisma } from '../lib/prisma.js';
import { getRedis } from '../lib/redis.js';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const promiseWithTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

export async function getDashboardHtml(): Promise<string> {
  // 1. Database Health Check
  let dbStatus = 'OFFLINE';
  let dbLatency: number | null = null;
  try {
    const dbStart = Date.now();
    await promiseWithTimeout(prisma.$queryRaw`SELECT 1`, 2000, null);
    dbLatency = Date.now() - dbStart;
    dbStatus = 'ONLINE';
  } catch (error) {
    dbStatus = 'OFFLINE';
  }

  // 2. Redis Health Check
  let redisStatus = 'OFFLINE';
  let redisLatency: number | null = null;
  try {
    const redisStart = Date.now();
    const pong = await promiseWithTimeout(getRedis().ping(), 2000, 'TIMEOUT');
    if (pong === 'PONG') {
      redisLatency = Date.now() - redisStart;
      redisStatus = 'ONLINE';
    }
  } catch (error) {
    redisStatus = 'OFFLINE';
  }

  // 3. System Metrics
  const systemUptime = formatUptime(os.uptime());
  const processUptime = formatUptime(process.uptime());
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  const cpuModel = os.cpus()[0]?.model || 'Unknown CPU';
  const cpuCores = os.cpus().length;
  const loadAvg = os.loadavg().map(v => v.toFixed(2)).join(', ');

  const nodeVersion = process.version;
  const processMem = process.memoryUsage();

  // Overall system health
  const isHealthy = dbStatus === 'ONLINE' && redisStatus === 'ONLINE';
  const statusLabel = isHealthy ? 'Healthy' : 'Degraded';
  const statusColor = isHealthy ? '#10b981' : '#f59e0b';
  const statusGlow = isHealthy ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bastion Nexus — Server Health Status</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #020617 100%);
      --card-bg: rgba(30, 41, 59, 0.45);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-border-hover: rgba(255, 255, 255, 0.15);
      --text-main: #f8fafc;
      --text-sub: #94a3b8;
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.15);
      
      --status-ok: #10b981;
      --status-ok-glow: rgba(16, 185, 129, 0.2);
      --status-warn: #f59e0b;
      --status-warn-glow: rgba(245, 158, 11, 0.2);
      --status-err: #ef4444;
      --status-err-glow: rgba(239, 68, 68, 0.2);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg-gradient);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 2.5rem 1.5rem;
      overflow-x: hidden;
    }

    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }

    .brand-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .brand-title {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, #60a5fa, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-sub {
      font-size: 0.9rem;
      color: var(--text-sub);
    }

    .overall-status {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid var(--card-border);
      padding: 0.6rem 1.2rem;
      border-radius: 50px;
      font-weight: 500;
      font-size: 0.95rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    }

    .pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--status-color);
      box-shadow: 0 0 0 0 var(--status-glow);
      animation: pulse 2s infinite;
    }

    /* Grid Layout */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.5rem;
      width: 100%;
      margin-bottom: 2.5rem;
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: var(--card-accent, var(--primary));
      opacity: 0.7;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: var(--card-border-hover);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.25);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 30px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge.online {
      background: var(--status-ok-glow);
      color: var(--status-ok);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge.offline {
      background: var(--status-err-glow);
      color: var(--status-err);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* List stats */
    .stat-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.925rem;
    }

    .stat-label {
      color: var(--text-sub);
    }

    .stat-value {
      font-weight: 500;
      color: var(--text-main);
      word-break: break-all;
      text-align: right;
      max-width: 70%;
    }

    /* Progress bar */
    .progress-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .progress-bar-bg {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      height: 8px;
      width: 100%;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
      border-radius: 10px;
      transition: width 1s ease-in-out;
    }

    /* Links Section */
    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      width: 100%;
      margin-bottom: 2.5rem;
    }

    .btn-link {
      background: rgba(30, 41, 59, 0.3);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1rem;
      text-decoration: none;
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: 500;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }

    .btn-link:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.4);
      transform: translateY(-2px);
    }

    /* Footer */
    footer {
      text-align: center;
      color: var(--text-sub);
      font-size: 0.85rem;
      margin-top: auto;
      border-top: 1px solid var(--card-border);
      padding-top: 1.5rem;
      width: 100%;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 var(--status-glow);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
      }
    }

    @media (max-width: 640px) {
      body {
        padding: 1.5rem 1rem;
      }
      header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .overall-status {
        align-self: flex-start;
      }
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container" style="--status-color: ${statusColor}; --status-glow: ${statusGlow}">
    <header>
      <div class="brand-section">
        <h1 class="brand-title">Bastion Nexus API</h1>
        <p class="brand-sub">Production Gateway Monitor</p>
      </div>
      <div class="overall-status">
        <div class="pulse-dot"></div>
        <span>System Status: <strong>${statusLabel}</strong></span>
      </div>
    </header>

    <main>
      <div class="grid">
        <!-- Database Card -->
        <div class="card" style="--card-accent: ${dbStatus === 'ONLINE' ? 'var(--status-ok)' : 'var(--status-err)'}">
          <div class="card-header">
            <h2 class="card-title">Database Client</h2>
            <span class="badge ${dbStatus.toLowerCase()}">${dbStatus}</span>
          </div>
          <div class="stat-list">
            <div class="stat-row">
              <span class="stat-label">Database Type</span>
              <span class="stat-value">PostgreSQL (Prisma)</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Connection Latency</span>
              <span class="stat-value">${dbLatency !== null ? `${dbLatency} ms` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <!-- Redis Card -->
        <div class="card" style="--card-accent: ${redisStatus === 'ONLINE' ? 'var(--status-ok)' : 'var(--status-err)'}">
          <div class="card-header">
            <h2 class="card-title">Redis Cache</h2>
            <span class="badge ${redisStatus.toLowerCase()}">${redisStatus}</span>
          </div>
          <div class="stat-list">
            <div class="stat-row">
              <span class="stat-label">Engine Client</span>
              <span class="stat-value">ioredis</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Ping Latency</span>
              <span class="stat-value">${redisLatency !== null ? `${redisLatency} ms` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <!-- System Resources -->
        <div class="card" style="--card-accent: var(--primary)">
          <div class="card-header">
            <h2 class="card-title">System Resources</h2>
          </div>
          <div class="stat-list">
            <div class="stat-row">
              <span class="stat-label">OS Platform</span>
              <span class="stat-value">${os.platform()} (${os.arch()})</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">CPU Cores</span>
              <span class="stat-value">${cpuCores} Cores</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">CPU Model</span>
              <span class="stat-value">${cpuModel}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Uptime</span>
              <span class="stat-value">${systemUptime}</span>
            </div>
            <div class="progress-container">
              <div class="stat-row">
                <span class="stat-label">Memory Utilization (${memPercent}%)</span>
                <span class="stat-value">${formatBytes(usedMem)} / ${formatBytes(totalMem)}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${memPercent}%; background: ${memPercent > 85 ? 'var(--status-err)' : 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)'}"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Node.js Process -->
        <div class="card" style="--card-accent: var(--primary)">
          <div class="card-header">
            <h2 class="card-title">Runtime Process</h2>
          </div>
          <div class="stat-list">
            <div class="stat-row">
              <span class="stat-label">Node Version</span>
              <span class="stat-value">${nodeVersion}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">App Uptime</span>
              <span class="stat-value">${processUptime}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">RSS Memory</span>
              <span class="stat-value">${formatBytes(processMem.rss)}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Heap Memory</span>
              <span class="stat-value">${formatBytes(processMem.heapUsed)} / ${formatBytes(processMem.heapTotal)}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Load Average</span>
              <span class="stat-value">${loadAvg || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="links-grid">
        <a href="/api-docs" class="btn-link" target="_blank">
          📄 Interactive API Docs (Swagger)
        </a>
        <a href="/api/health" class="btn-link" target="_blank">
          🔍 Health JSON Endpoint
        </a>
      </div>
    </main>

    <footer>
      <p>Bastion Nexus Service Core • Gateway v0.2.0 • Local Time: ${new Date().toISOString()}</p>
    </footer>
  </div>
</body>
</html>
  `;
}

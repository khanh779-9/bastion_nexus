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

function highlightJson(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
}

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
  const statusColor = isHealthy ? '#059669' : '#d97706';
  const statusGlow = isHealthy ? 'rgba(5, 150, 105, 0.3)' : 'rgba(217, 119, 6, 0.3)';

  // Static Endpoints JSON from original behavior
  const endpointsJson = {
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
  };

  const rawJsonString = JSON.stringify(endpointsJson, null, 2);
  const highlightedJsonHtml = highlightJson(rawJsonString);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bastion Nexus — Server Status & Endpoints</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f1f5f9;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --text-main: #0f172a;
      --text-sub: #475569;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      
      --status-ok: #059669;
      --status-ok-bg: #ecfdf5;
      --status-ok-border: #a7f3d0;
      
      --status-err: #dc2626;
      --status-err-bg: #fef2f2;
      --status-err-border: #fecaca;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
    }

    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      flex-grow: 1;
    }

    /* Header */
    header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--primary);
    }

    .brand-divider {
      width: 1px;
      height: 20px;
      background: var(--card-border);
    }

    .brand-sub {
      font-size: 0.85rem;
      color: var(--text-sub);
      font-weight: 500;
    }

    .overall-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid var(--card-border);
      padding: 0.4rem 0.85rem;
      border-radius: 30px;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${statusColor};
      box-shadow: 0 0 0 0 ${statusGlow};
      animation: pulse 2s infinite;
    }

    /* Layout Columns */
    .dashboard-layout {
      display: grid;
      grid-template-columns: 4.5fr 5.5fr;
      gap: 1.25rem;
      width: 100%;
      align-items: start;
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 0.5rem;
    }

    /* Status badges */
    .badge {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge.online {
      background: var(--status-ok-bg);
      color: var(--status-ok);
      border: 1px solid var(--status-ok-border);
    }

    .badge.offline {
      background: var(--status-err-bg);
      color: var(--status-err);
      border: 1px solid var(--status-err-border);
    }

    /* Stats List */
    .stat-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .stat-label {
      color: var(--text-sub);
      font-weight: 500;
    }

    .stat-value {
      font-weight: 600;
      color: var(--text-main);
      text-align: right;
      word-break: break-all;
    }

    /* Progress bar */
    .progress-container {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-top: 0.25rem;
    }

    .progress-bar-bg {
      background: #f1f5f9;
      border-radius: 6px;
      height: 6px;
      width: 100%;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 6px;
    }

    /* Services Side-by-side */
    .services-status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .service-mini-card {
      background: #f8fafc;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .service-mini-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .service-mini-latency {
      font-size: 0.75rem;
      color: var(--text-sub);
    }

    /* JSON Schema Code Block */
    .json-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      height: 100%;
    }

    .json-header-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 0.5rem;
    }

    .btn-copy {
      background: #f1f5f9;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 0.3rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-sub);
      transition: all 0.15s ease;
    }

    .btn-copy:hover {
      background: #e2e8f0;
      color: var(--text-main);
    }

    .code-container {
      background: #f8fafc;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    /* JSON syntax colors (light theme editor style) */
    .json-key { color: #0969da; font-weight: 500; }     /* Blue */
    .json-string { color: #1a7f37; }  /* Green */
    .json-number { color: #cf222e; }  /* Red */
    .json-boolean { color: #bc4c00; font-weight: bold; } /* Orange */
    .json-null { color: #8c959f; }

    /* Documentation links */
    .links-container {
      display: flex;
      gap: 0.75rem;
    }

    .btn-link {
      flex: 1;
      background: #ffffff;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.65rem;
      text-decoration: none;
      color: var(--text-main);
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .btn-link:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    /* Footer */
    footer {
      text-align: center;
      color: var(--text-sub);
      font-size: 0.75rem;
      border-top: 1px solid var(--card-border);
      padding-top: 1rem;
      margin-top: auto;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 ${statusGlow};
      }
      70% {
        box-shadow: 0 0 0 6px rgba(0, 0, 0, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
      }
    }

    @media (max-width: 850px) {
      .dashboard-layout {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-section">
        <h1 class="brand-title">Bastion Nexus</h1>
        <div class="brand-divider"></div>
        <p class="brand-sub">Core Gateway Monitor</p>
      </div>
      <div class="overall-status">
        <div class="pulse-dot"></div>
        <span>Status: ${statusLabel}</span>
      </div>
    </header>

    <main class="dashboard-layout">
      <!-- Left Column: Metrics and Services -->
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Services Status Card -->
        <div class="card">
          <h2 class="card-title">Connected Services</h2>
          <div class="services-status-grid">
            <div class="service-mini-card">
              <div class="service-mini-header">
                <span>Postgres</span>
                <span class="badge ${dbStatus.toLowerCase()}">${dbStatus}</span>
              </div>
              <span class="service-mini-latency">${dbLatency !== null ? `${dbLatency}ms latency` : 'Connection Down'}</span>
            </div>
            <div class="service-mini-card">
              <div class="service-mini-header">
                <span>Redis</span>
                <span class="badge ${redisStatus.toLowerCase()}">${redisStatus}</span>
              </div>
              <span class="service-mini-latency">${redisLatency !== null ? `${redisLatency}ms latency` : 'Connection Down'}</span>
            </div>
          </div>
        </div>

        <!-- System Resources Card -->
        <div class="card">
          <h2 class="card-title">System Metrics</h2>
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
              <span class="stat-label">Host CPU</span>
              <span class="stat-value" style="font-size:0.75rem; max-width: 65%;">${cpuModel}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Node JS</span>
              <span class="stat-value">${nodeVersion}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Server Uptime</span>
              <span class="stat-value">${systemUptime}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">App Uptime</span>
              <span class="stat-value">${processUptime}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Process RAM</span>
              <span class="stat-value">${formatBytes(processMem.heapUsed)} (used) / ${formatBytes(processMem.heapTotal)} (total)</span>
            </div>
            <div class="progress-container">
              <div class="stat-row">
                <span class="stat-label">Server Memory (${memPercent}%)</span>
                <span class="stat-value">${formatBytes(usedMem)} / ${formatBytes(totalMem)}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${memPercent}%; background: ${memPercent > 85 ? 'var(--status-err)' : 'var(--primary)'}"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Document Links -->
        <div class="links-container">
          <a href="/api-docs" class="btn-link" target="_blank">📄 Swagger Docs</a>
          <a href="/api/health" class="btn-link" target="_blank">🔍 Health API</a>
        </div>
      </div>

      <!-- Right Column: JSON Endpoint schema -->
      <div class="card json-card">
        <div class="json-header-action">
          <h2 class="card-title" style="border: none; padding: 0;">API Gateway Routes Schema</h2>
          <button class="btn-copy" onclick="copyJsonToClipboard()">Copy JSON</button>
        </div>
        <pre class="code-container" id="json-code"><code>${highlightedJsonHtml}</code></pre>
      </div>
    </main>

    <footer>
      <p>Gateway v0.2.0 • API Server time: ${new Date().toISOString()}</p>
    </footer>
  </div>

  <script>
    function copyJsonToClipboard() {
      const code = document.getElementById('json-code').innerText;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.btn-copy');
        btn.innerText = 'Copied!';
        btn.style.background = '#ecfdf5';
        btn.style.borderColor = '#a7f3d0';
        btn.style.color = '#059669';
        setTimeout(() => {
          btn.innerText = 'Copy JSON';
          btn.style.background = '#f1f5f9';
          btn.style.borderColor = 'var(--card-border)';
          btn.style.color = 'var(--text-sub)';
        }, 2000);
      });
    }
  </script>
</body>
</html>
  `;
}

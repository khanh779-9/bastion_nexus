import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import axios from 'axios';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// Schema for adding a new monitor
const monitorSchema = z.object({
  monitor_type: z.enum(['email', 'username', 'domain', 'phone', 'wallet', 'password', 'custom']).default('email'),
  monitor_value: z.string().min(1, 'Value required'),
  status: z.enum(['active', 'paused', 'deleted']).default('active')
});

interface BreachCheckResult {
  breached: boolean;
  breach_source?: string;
  breach_date?: string;
  raw_data?: any;
}

// Mock HIBP check (or real if API key exists)
async function checkBreach(value: string): Promise<BreachCheckResult> {
  const apiKey = process.env.HIBP_API_KEY;
  if (!apiKey) {
    // Simulation Mode
    if (value.includes('pwned')) {
      return {
        breached: true,
        breach_source: 'Simulated Breach (HIBP)',
        breach_date: new Date().toISOString(),
        raw_data: { Title: 'Adobe', Domain: 'adobe.com', BreachDate: '2013-10-04', Description: 'This is a simulated breach for testing purposes.' }
      };
    }
    return { breached: false };
  }

  // Real API Call
  try {
    const encodedAccount = encodeURIComponent(value);
    const response = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodedAccount}?truncateResponse=false`, {
      headers: {
        'hibp-api-key': apiKey,
        'user-agent': 'Bastion-Nexus'
      }
    });

    if (response.data && response.data.length > 0) {
      const latest = response.data[0];
      return {
        breached: true,
        breach_source: latest.Title,
        breach_date: latest.BreachDate,
        raw_data: latest
      };
    }
    return { breached: false };
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return { breached: false }; // Not found = safe
    }
    console.error('HIBP API Error:', error.message);
    throw new Error('Failed to check breach status');
  }
}

// Get all monitors for user
router.get('/monitor', requireAuth, async (req: AuthRequest, res) => {
  try {
    const monitors = await prisma.breachMonitor.findMany({
      where: {
        userId: req.user.id,
        status: { not: 'deleted' }
      },
      include: {
        results: {
          orderBy: { checkedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map to frontend compatibility format
    const mapped = monitors.map(m => {
      const latestResult = m.results[0];
      return {
        id: m.id,
        user_id: m.userId,
        monitor_type: m.monitorType,
        monitor_value: m.monitorValue,
        status: m.status,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
        breached: latestResult ? latestResult.breached : false,
        breach_source: latestResult ? latestResult.breachSource : null,
        checked_at: latestResult ? latestResult.checkedAt : null
      };
    });

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch monitors' });
  }
});

// Add a new monitor
router.post('/monitor', requireAuth, async (req: AuthRequest, res) => {
  const parse = monitorSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { monitor_type, monitor_value, status } = parse.data;

  try {
    // Check if already exists (using automatic decryption from Prisma)
    const existingMonitors = await prisma.breachMonitor.findMany({
      where: {
        userId: req.user.id,
        status: { not: 'deleted' }
      }
    });

    const isDuplicate = existingMonitors.some(m => m.monitorValue === monitor_value);
    if (isDuplicate) {
      return res.status(409).json({ error: 'Already monitoring this value' });
    }

    // Create monitor (Prisma auto-encrypts monitorValue)
    const newMonitor = await prisma.breachMonitor.create({
      data: {
        userId: req.user.id,
        monitorType: monitor_type,
        monitorValue: monitor_value,
        status
      }
    });

    // Trigger initial check using the plaintext value
    const checkResult = await checkBreach(monitor_value);

    // Save result
    await prisma.breachResult.create({
      data: {
        monitorId: newMonitor.id,
        breached: checkResult.breached,
        breachSource: checkResult.breach_source ?? null,
        breachDate: checkResult.breach_date ? new Date(checkResult.breach_date) : null,
        rawData: checkResult.raw_data ?? null
      }
    });

    res.status(201).json({
      id: newMonitor.id,
      user_id: newMonitor.userId,
      monitor_type: newMonitor.monitorType,
      monitor_value: monitor_value, // Return plaintext to frontend
      status: newMonitor.status,
      created_at: newMonitor.createdAt,
      updated_at: newMonitor.updatedAt,
      breached: checkResult.breached,
      breach_source: checkResult.breach_source ?? null,
      checked_at: new Date()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create monitor' });
  }
});

// Manual verify/check endpoint
router.post('/check', requireAuth, async (req: AuthRequest, res) => {
  const { value } = req.body;
  if (!value) return res.status(400).json({ error: 'Value required' });

  try {
    const result = await checkBreach(value);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/monitor/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  
  try {
    const exists = await prisma.breachMonitor.findFirst({
      where: { id, userId: req.user.id }
    });
    if (!exists) return res.status(404).json({ error: 'Not found' });

    await prisma.breachMonitor.update({
      where: { id },
      data: { status: 'deleted' }
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete monitor' });
  }
});

export default router;

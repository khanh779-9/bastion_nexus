import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

const upsertSchema = z.object({
  type: z.enum(['website', 'email', 'server', 'database', 'application', 'other']).optional().default('other'),
  name: z.string().min(1, 'Name required').max(150),
  username: z.string().max(150).optional().nullable(),
  email: z.string().max(255).optional().nullable().refine(
    v => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    { message: 'Invalid email' }
  ),
  password: z.string().optional().nullable(),
  otp_secret: z.string().optional().nullable(),
  description: z.string().max(1000).optional().nullable()
});

router.get('/items', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.vaultItem.findMany({
      where: { accountId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        username: true,
        email: true,
        otpSecret: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Map properties for frontend backward-compatibility
    const mapped = items.map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      username: item.username,
      email: item.email,
      description: item.description,
      otp_secret: item.otpSecret,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }));

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.get('/items/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  
  try {
    const item = await prisma.vaultItem.findFirst({
      where: { accountId: req.user.id, id }
    });
    
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    // Map response for frontend
    res.json({
      id: item.id,
      account_id: Number(item.accountId),
      type: item.type,
      name: item.name,
      username: item.username,
      email: item.email,
      password: item.password,
      otp_secret: item.otpSecret,
      description: item.description,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

router.post('/items', requireAuth, async (req: AuthRequest, res) => {
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
  const { type, name, username, email, password, otp_secret, description } = parse.data;
  
  try {
    const item = await prisma.vaultItem.create({
      data: {
        accountId: req.user.id,
        type: type || 'other',
        name,
        username,
        email,
        password,
        otpSecret: otp_secret,
        description
      }
    });
    
    // Return compatible format
    res.status(201).json({
      id: item.id,
      type: item.type,
      name: item.name,
      username: item.username,
      email: item.email,
      description: item.description,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.put('/items/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  
  const parse = upsertSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
  const data = parse.data;
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update' });
  
  try {
    // Check ownership
    const exists = await prisma.vaultItem.findFirst({
      where: { accountId: req.user.id, id }
    });
    if (!exists) return res.status(404).json({ error: 'Not found' });

    // Map frontend camelCase/snake_case to Prisma fields
    await prisma.vaultItem.update({
      where: { id },
      data: {
        type: data.type,
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        otpSecret: data.otp_secret,
        description: data.description
      }
    });
    
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/items/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  
  try {
    const exists = await prisma.vaultItem.findFirst({
      where: { accountId: req.user.id, id }
    });
    if (!exists) return res.status(404).json({ error: 'Not found' });

    await prisma.vaultItem.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;

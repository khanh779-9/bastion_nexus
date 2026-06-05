import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptSensitive } from '../utils/encryption.js';
import { logAuditAction } from '../utils/auditLog.js';
import { AUDIT_ACTIONS } from '../types/index.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

const noteSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  content: z.string().min(1, 'Content required').max(10000),
  color: z.string().max(20).optional().nullable(),
  is_encrypted: z.boolean().optional(),
  password: z.string().optional().nullable()
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { accountId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Map response for frontend compatibility
    const mapped = notes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      color: n.color,
      is_encrypted: n.isEncrypted,
      created_at: n.createdAt,
      updated_at: n.updatedAt
    }));
    
    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parse = noteSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
  const { title, content, color, is_encrypted = false, password } = parse.data;
  
  try {
    let passwordBuffer: any = null;
    if (password) {
      const encrypted = encryptSensitive(password);
      passwordBuffer = Buffer.from(encrypted, 'utf8') as any;
    }

    const note = await prisma.note.create({
      data: {
        accountId: req.user.id,
        title,
        content,
        color: color ?? null,
        isEncrypted: is_encrypted,
        password: passwordBuffer
      }
    });

    logAuditAction(
      req.user.id,
      AUDIT_ACTIONS.NOTE_CREATED,
      'note',
      note.id,
      {},
      req
    ).catch(err => console.error("Audit log error:", err));
    
    res.status(201).json({
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      is_encrypted: note.isEncrypted,
      created_at: note.createdAt,
      updated_at: note.updatedAt
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id;
  const parse = noteSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
  const fields = parse.data;
  if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'No fields to update' });
  
  try {
    // Verify ownership
    const exists = await prisma.note.findFirst({
      where: { id, accountId: req.user.id }
    });
    if (!exists) return res.status(404).json({ error: 'Not found' });

    // Handle password field mapping
    let passwordBuffer: any = undefined;
    if (fields.password !== undefined) {
      if (fields.password === null) {
        passwordBuffer = null;
      } else {
        const encrypted = encryptSensitive(fields.password);
        passwordBuffer = Buffer.from(encrypted, 'utf8') as any;
      }
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        title: fields.title,
        content: fields.content,
        color: fields.color,
        isEncrypted: fields.is_encrypted,
        password: passwordBuffer
      }
    });

    logAuditAction(
      req.user.id,
      AUDIT_ACTIONS.NOTE_UPDATED,
      'note',
      id,
      {},
      req
    ).catch(err => console.error("Audit log error:", err));
    
    res.json({
      id: updated.id,
      title: updated.title,
      content: updated.content,
      color: updated.color,
      is_encrypted: updated.isEncrypted,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id;
  
  try {
    const exists = await prisma.note.findFirst({
      where: { id, accountId: req.user.id }
    });
    if (!exists) return res.status(404).json({ error: 'Not found' });

    await prisma.note.delete({
      where: { id }
    });

    logAuditAction(
      req.user.id,
      AUDIT_ACTIONS.NOTE_DELETED,
      'note',
      id,
      {},
      req
    ).catch(err => console.error("Audit log error:", err));
    
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Share endpoints
router.post('/:id/share', requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id;
  const { password, expired_at, max_views } = req.body || {};
  
  try {
    // Verify ownership
    const exists = await prisma.note.findFirst({
      where: { id, accountId: req.user.id }
    });
    if (!exists) return res.status(404).json({ error: 'Not found' });
    
    const hash = password ? await bcrypt.hash(password, 10) : null;
    
    const share = await prisma.noteShare.create({
      data: {
        noteId: id,
        passwordHash: hash,
        expiredAt: expired_at ? new Date(expired_at) : null,
        maxViews: max_views ?? null,
      }
    });

    logAuditAction(
      req.user.id,
      AUDIT_ACTIONS.NOTE_SHARED,
      'note',
      id,
      { shareToken: share.shareToken },
      req
    ).catch(err => console.error("Audit log error:", err));
    
    res.status(201).json({
      id: share.id,
      share_token: share.shareToken,
      expired_at: share.expiredAt,
      max_views: share.maxViews,
      view_count: share.viewCount
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

router.get('/share/:token', async (req, res) => {
  const token = req.params.token;
  
  try {
    const share = await prisma.noteShare.findFirst({
      where: { shareToken: token, revokedAt: null },
      include: {
        note: true
      }
    });
    
    if (!share) return res.status(404).json({ error: 'Not found' });
    
    // Expiration and views check
    if (share.expiredAt && new Date(share.expiredAt) < new Date()) {
      return res.status(410).json({ error: 'Share expired' });
    }
    if (share.maxViews && share.viewCount >= share.maxViews) {
      return res.status(410).json({ error: 'Share expired' });
    }
    
    // Increment view_count
    await prisma.noteShare.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } }
    });
    
    res.json({
      title: share.note.title,
      content: share.note.content,
      requires_password: !!share.passwordHash
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch share' });
  }
});

router.post('/share/:token/verify', async (req, res) => {
  const token = req.params.token;
  const { password } = req.body || {};
  
  try {
    const share = await prisma.noteShare.findFirst({
      where: { shareToken: token, revokedAt: null }
    });
    
    if (!share) return res.status(404).json({ error: 'Not found' });
    if (!share.passwordHash) return res.json({ valid: true });
    
    const ok = await bcrypt.compare(password || '', share.passwordHash);
    res.json({ valid: ok });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Revoke share
router.post('/share/:token/revoke', requireAuth, async (req: AuthRequest, res) => {
  const token = req.params.token;
  
  try {
    // Verify ownership
    const share = await prisma.noteShare.findFirst({
      where: { shareToken: token },
      include: {
        note: true
      }
    });
    
    if (!share || share.note.accountId !== req.user.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    await prisma.noteShare.update({
      where: { id: share.id },
      data: { revokedAt: new Date() }
    });

    logAuditAction(
      req.user.id,
      AUDIT_ACTIONS.NOTE_SHARE_REVOKED,
      'note',
      share.noteId,
      { shareToken: token },
      req
    ).catch(err => console.error("Audit log error:", err));
    
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptSensitive, decryptSensitive } from '../utils/encryption.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

const walletItemSchema = z.object({
  wallet_type: z.enum(['crypto', 'card', 'id_card', 'bank_account', 'other']).default('other'),
  name: z.string().min(1, 'Name required'),
  address: z.string().optional().nullable(),
  secret: z.string().min(1, 'Secret/Private Key/Full Number required'),
  description: z.string().optional().nullable(),
  metadata: z.record(z.string()).optional()
});

function tryDecrypt(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  try {
    if (value.includes(':') && value.split(':').length === 3) {
       return decryptSensitive(value);
    }
    return value;
  } catch (e) {
    return value;
  }
}

// Get all wallet items
router.get('/items', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.walletItem.findMany({
      where: { accountId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });

    const mapped = items.map(item => ({
      id: item.id,
      wallet_type: item.walletType,
      name: item.name,
      address: item.address,
      description: item.description,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }));

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch wallet items' });
  }
});

// Get single item with secret
router.get('/items/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  
  try {
    const item = await prisma.walletItem.findFirst({
      where: { accountId: req.user.id, id }
    });

    if (!item) return res.status(404).json({ error: 'Not found' });

    let decryptedSecret = '';
    if (item.encryptedSecret) {
      const secretStr = Buffer.from(item.encryptedSecret).toString('utf8');
      try {
        decryptedSecret = decryptSensitive(secretStr);
      } catch (err) {
        console.error('Decryption failed for item secret', id);
        decryptedSecret = '[Decryption Failed]';
      }
    }

    const metadata = await prisma.walletMetadata.findMany({
      where: { walletId: id }
    });

    const mappedMetadata: Record<string, any> = {};
    metadata.forEach(r => {
      mappedMetadata[r.key] = tryDecrypt(r.value);
    });

    res.json({
      id: item.id,
      account_id: Number(item.accountId),
      wallet_type: item.walletType,
      name: item.name,
      address: item.address,
      secret: decryptedSecret,
      description: item.description,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      metadata: mappedMetadata
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create item
router.post('/items', requireAuth, async (req: AuthRequest, res) => {
  const parse = walletItemSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { wallet_type, name, address, secret, description, metadata } = parse.data;

  try {
    const encryptedSecretStr = encryptSensitive(secret);
    const secretBuffer = Buffer.from(encryptedSecretStr, 'utf8');

    const result = await prisma.$transaction(async (tx) => {
      const newItem = await tx.walletItem.create({
        data: {
          accountId: req.user.id,
          walletType: wallet_type,
          name,
          address,
          encryptedSecret: secretBuffer,
          description
        }
      });

      if (metadata && Object.keys(metadata).length > 0) {
        for (const [key, value] of Object.entries(metadata)) {
          await tx.walletMetadata.create({
            data: {
              walletId: newItem.id,
              key,
              value: encryptSensitive(String(value))
            }
          });
        }
      }
      return newItem;
    });

    res.status(201).json({
      id: result.id,
      wallet_type,
      name,
      created_at: result.createdAt
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
router.put('/items/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  
  const parse = walletItemSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
  const { wallet_type, name, address, secret, description, metadata } = parse.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Check ownership
      const check = await tx.walletItem.findFirst({
        where: { id, accountId: req.user.id }
      });
      if (!check) {
        throw new Error('NOT_FOUND');
      }

      // Update main fields
      const dataToUpdate: any = {};
      if (wallet_type !== undefined) dataToUpdate.walletType = wallet_type;
      if (name !== undefined) dataToUpdate.name = name;
      if (address !== undefined) dataToUpdate.address = address;
      if (description !== undefined) dataToUpdate.description = description;
      if (secret !== undefined) {
        const encrypted = encryptSensitive(secret);
        dataToUpdate.encryptedSecret = Buffer.from(encrypted, 'utf8');
      }

      if (Object.keys(dataToUpdate).length > 0) {
        await tx.walletItem.update({
          where: { id },
          data: dataToUpdate
        });
      }

      // Update metadata
      if (metadata) {
        await tx.walletMetadata.deleteMany({
          where: { walletId: id }
        });
        for (const [key, value] of Object.entries(metadata)) {
          await tx.walletMetadata.create({
            data: {
              walletId: id,
              key,
              value: encryptSensitive(String(value))
            }
          });
        }
      }
    });

    res.json({ success: true });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.error(e);
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/items/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  
  try {
    const exists = await prisma.walletItem.findFirst({
      where: { id, accountId: req.user.id }
    });
    if (!exists) return res.status(404).json({ error: 'Not found' });

    await prisma.walletItem.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;

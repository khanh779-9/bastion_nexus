import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// Cập nhật email và/hoặc mật khẩu
router.post('/settings', requireAuth, async (req: AuthRequest, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email && !newPassword) return res.status(400).json({ error: 'No data to update' });
  try {
    // Đổi email
    if (email) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { email }
      });
    }
    // Đổi mật khẩu
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Missing current password' });
      
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
      
      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hash }
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Lấy tất cả settings giao diện cho user
router.get('/appearance-settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: {
        accountId_key: {
          accountId: req.user.id,
          key: 'user-interface'
        }
      }
    });
    
    if (!setting || !setting.value) return res.json({});
    
    let settings = {};
    try {
      settings = JSON.parse(setting.value);
    } catch (e) {}
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch appearance settings' });
  }
});

// Cập nhật settings giao diện cho user (nhiều key-value)
router.post('/appearance-settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const value = JSON.stringify(req.body || {});
    await prisma.setting.upsert({
      where: {
        accountId_key: {
          accountId: req.user.id,
          key: 'user-interface'
        }
      },
      create: {
        accountId: req.user.id,
        key: 'user-interface',
        value
      },
      update: {
        value
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update appearance settings' });
  }
});

// Lấy theme giao diện từ settings
router.get('/theme', requireAuth, async (req: AuthRequest, res) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: {
        accountId_key: {
          accountId: req.user.id,
          key: 'theme'
        }
      }
    });
    res.json({ theme: setting?.value || 'auto' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
});

// Cập nhật theme giao diện vào settings
router.post('/theme', requireAuth, async (req: AuthRequest, res) => {
  const { theme } = req.body;
  if (!['light', 'dark', 'auto'].includes(theme)) {
    return res.status(400).json({ error: 'Invalid theme' });
  }
  try {
    await prisma.setting.upsert({
      where: {
        accountId_key: {
          accountId: req.user.id,
          key: 'theme'
        }
      },
      create: {
        accountId: req.user.id,
        key: 'theme',
        value: theme
      },
      update: {
        value: theme
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

// Lấy thông tin user cơ bản
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    console.log('Fetched user profile for user ID:', req.user.id);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    res.json({
      id: user.id,
      email: user.email,
      status: user.status,
      created_at: formatDate(user.createdAt),
      updated_at: formatDate(user.updatedAt)
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Lấy thông tin profile chi tiết
router.get('/profile-detail', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { accountId: req.user.id }
    });
    
    if (!profile) return res.json({});
    
    const formatDate = (date: Date | null) => date ? date.toISOString().split('T')[0] : null;
    
    res.json({
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
      phone: profile.phone,
      birthday: formatDate(profile.birthday),
      bio: profile.bio
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Cập nhật thông tin profile chi tiết
const profileSchema = z.object({
  display_name: z.string().max(255).optional(),
  avatar_url: z.string().url().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  birthday: z.string().optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
});

router.post('/profile-detail', requireAuth, async (req: AuthRequest, res) => {
  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
  const { display_name, avatar_url, phone, birthday, bio } = parse.data;
  try {
    const birthdayDate = birthday ? new Date(birthday) : null;
    
    await prisma.profile.upsert({
      where: { accountId: req.user.id },
      create: {
        accountId: req.user.id,
        displayName: display_name || req.user.email,
        avatarUrl: avatar_url,
        phone,
        birthday: birthdayDate,
        bio
      },
      update: {
        displayName: display_name,
        avatarUrl: avatar_url,
        phone,
        birthday: birthdayDate,
        bio
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Xóa tài khoản
router.delete('/delete-account', requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.user.id }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;

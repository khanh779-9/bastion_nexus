import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { config } from "../config/index.js";
import { logAuditAction } from "../utils/auditLog.js";
import { AUDIT_ACTIONS } from "../types/index.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(255),
});

router.post("/register", async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });

  const { email, password } = parse.data;
  const lowercaseEmail = email.toLowerCase();

  try {
    // Check email uniqueness
    const emailExists = await prisma.user.findUnique({
      where: { email: lowercaseEmail },
    });
    
    if (emailExists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 12);
    
    // Create user and profile in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: lowercaseEmail,
          password: hash,
          status: "active",
        },
      });

      // Tạo profile mặc định cho user mới (dùng email làm display_name tạm thời)
      await tx.profile.create({
        data: {
          accountId: newUser.id,
          displayName: lowercaseEmail,
        },
      });

      return newUser;
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    // Audit log (non-blocking)
    logAuditAction(
      user.id,
      AUDIT_ACTIONS.USER_REGISTERED,
      "user",
      String(user.id),
      {},
      req
    ).catch((err) => console.error("Audit log error:", err));

    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (e: any) {
    console.error("Register error:", e.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

router.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });

  const { email, password } = parse.data;
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: "Account does not exist" });
    }

    const status = (user.status || "").toLowerCase();
    if (status && status !== "active") {
      logAuditAction(
        null,
        AUDIT_ACTIONS.FAILED_LOGIN,
        "user",
        String(user.id),
        { reason: "inactive" },
        req
      ).catch((err) => console.error("Audit log error:", err));
      return res.status(403).json({ error: "Account is not active" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      logAuditAction(
        null,
        AUDIT_ACTIONS.FAILED_LOGIN,
        "user",
        String(user.id),
        { reason: "wrong_password" },
        req
      ).catch((err) => console.error("Audit log error:", err));
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    // Audit log (non-blocking)
    logAuditAction(
      user.id,
      AUDIT_ACTIONS.USER_LOGIN,
      "user",
      String(user.id),
      {},
      req
    ).catch((err) => console.error("Audit log error:", err));

    try {
      const { parseUserAgent } = await import("../utils/userAgent.js");
      const ua = req.headers["user-agent"] || "";
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket?.remoteAddress ||
        "";
      const { browser, os, device } = parseUserAgent(ua);
      const content = `browser: ${browser}\ndevice: ${device}\nos: ${os}\nip: ${ip}`;
      
      await prisma.notification.create({
        data: {
          accountId: user.id,
          type: 'security',
          title: 'login',
          content,
        }
      });
    } catch (e: any) {
      console.error("Notification error:", e.message);
    }

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e: any) {
    console.error("Login error:", e.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// Lấy 5 thông báo mới nhất
router.get("/user/notifications", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { accountId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        isRead: true,
        createdAt: true,
      }
    });
    
    // Map response for frontend compatibility
    const mapped = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      is_read: n.isRead,
      created_at: n.createdAt,
    }));
    
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Lấy tất cả thông báo
router.get("/user/notifications/all", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { accountId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        isRead: true,
        createdAt: true,
      }
    });
    
    const mapped = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      is_read: n.isRead,
      created_at: n.createdAt,
    }));
    
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Đánh dấu thông báo là đã xem
router.patch("/user/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid notification ID" });
    
    const { is_read } = req.body;
    
    // Check if notification exists and belongs to user
    const exists = await prisma.notification.findFirst({
      where: { id, accountId: req.user.id }
    });
    
    if (!exists) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: is_read,
        readAt: is_read ? new Date() : null,
      }
    });
    
    res.status(200).json({ 
      success: true, 
      notification: {
        id: updated.id,
        type: updated.type,
        title: updated.title,
        content: updated.content,
        is_read: updated.isRead,
        created_at: updated.createdAt,
      } 
    });
  } catch (e) {
    console.error('Update notification error:', e);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;

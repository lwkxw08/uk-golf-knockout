const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const config = require('../config');
const { isPushConfigured } = require('../services/notificationService');

const router = express.Router();

async function requirePlayer(req, res) {
  const player = await prisma.player.findUnique({ where: { userId: req.user.id }, select: { id: true } });
  if (!player) {
    res.status(404).json({ error: 'Player profile not found' });
    return null;
  }
  return player;
}

// List notifications (newest first)
router.get('/',
  authenticate,
  query('unreadOnly').optional().isBoolean(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res) => {
    try {
      const player = await requirePlayer(req, res);
      if (!player) return;

      const limit = parseInt(req.query.limit, 10) || 30;
      const where = { playerId: player.id };
      if (req.query.unreadOnly === 'true') where.isRead = false;

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
        prisma.notification.count({ where: { playerId: player.id, isRead: false } }),
      ]);

      res.json({ notifications, unreadCount });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load notifications' });
    }
  }
);

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;

    const unreadCount = await prisma.notification.count({ where: { playerId: player.id, isRead: false } });
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load unread count' });
  }
});

router.patch('/:id/read',
  authenticate,
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const player = await requirePlayer(req, res);
      if (!player) return;

      const { count } = await prisma.notification.updateMany({
        where: { id: req.params.id, playerId: player.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      if (count === 0) {
        const exists = await prisma.notification.findFirst({ where: { id: req.params.id, playerId: player.id } });
        if (!exists) return res.status(404).json({ error: 'Notification not found' });
      }

      const unreadCount = await prisma.notification.count({ where: { playerId: player.id, isRead: false } });
      res.json({ success: true, unreadCount });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark notification read' });
    }
  }
);

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;

    await prisma.notification.updateMany({
      where: { playerId: player.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

router.delete('/:id',
  authenticate,
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const player = await requirePlayer(req, res);
      if (!player) return;

      await prisma.notification.deleteMany({ where: { id: req.params.id, playerId: player.id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
);

// ─── PREFERENCES ─────────────────────────────────────────────────────────

router.get('/preferences', authenticate, async (req, res) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;

    const prefs = await prisma.notificationPreference.findUnique({ where: { playerId: player.id } });
    res.json(prefs || { email: true, push: true, mutedTypes: [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

router.put('/preferences',
  authenticate,
  body('email').optional().isBoolean(),
  body('push').optional().isBoolean(),
  body('mutedTypes').optional().isArray(),
  validate,
  async (req, res) => {
    try {
      const player = await requirePlayer(req, res);
      if (!player) return;

      const { email, push, mutedTypes } = req.body;
      const data = {};
      if (email !== undefined) data.email = email;
      if (push !== undefined) data.push = push;
      if (mutedTypes !== undefined) data.mutedTypes = mutedTypes;

      const prefs = await prisma.notificationPreference.upsert({
        where: { playerId: player.id },
        update: data,
        create: { playerId: player.id, ...data },
      });
      res.json(prefs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to save preferences' });
    }
  }
);

// ─── WEB PUSH ────────────────────────────────────────────────────────────

router.get('/push/public-key', (req, res) => {
  res.json({ configured: isPushConfigured(), publicKey: config.push.publicKey || null });
});

router.post('/push/subscribe',
  authenticate,
  body('endpoint').isURL(),
  body('keys.p256dh').notEmpty(),
  body('keys.auth').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const player = await requirePlayer(req, res);
      if (!player) return;

      const { endpoint, keys } = req.body;
      const subscription = await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { playerId: player.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: req.headers['user-agent'] },
        create: {
          playerId: player.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: req.headers['user-agent'],
        },
      });
      res.status(201).json({ success: true, id: subscription.id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save push subscription' });
    }
  }
);

router.post('/push/unsubscribe',
  authenticate,
  body('endpoint').isURL(),
  validate,
  async (req, res) => {
    try {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: req.body.endpoint } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove push subscription' });
    }
  }
);

module.exports = router;

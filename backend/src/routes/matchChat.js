const express = require('express');
const { param, body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Get messages for a match
router.get('/:matchId/messages',
  authenticate,
  param('matchId').isUUID(),
  query('before').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can view messages' });
      }

      const limit = parseInt(req.query.limit) || 50;
      const where = { matchId: req.params.matchId };
      if (req.query.before) where.createdAt = { lt: new Date(req.query.before) };

      const messages = await prisma.matchMessage.findMany({
        where,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Mark unread messages as read
      await prisma.matchMessage.updateMany({
        where: {
          matchId: req.params.matchId,
          senderId: { not: player.id },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      res.json(messages.reverse());
    } catch (err) {
      console.error('Chat fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
);

// Send a message
router.post('/:matchId/messages',
  authenticate,
  param('matchId').isUUID(),
  body('content').isString().isLength({ min: 1, max: 1000 }),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can send messages' });
      }

      const message = await prisma.matchMessage.create({
        data: {
          matchId: req.params.matchId,
          senderId: player.id,
          content: req.body.content,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      });

      // Emit via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(`match-${req.params.matchId}`).emit('chat:message', message);
      }

      res.status(201).json(message);
    } catch (err) {
      console.error('Chat send error:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// Get unread message count for current user
router.get('/unread',
  authenticate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.json({ count: 0 });

      const count = await prisma.matchMessage.count({
        where: {
          senderId: { not: player.id },
          readAt: null,
          match: {
            OR: [{ playerAId: player.id }, { playerBId: player.id }],
          },
        },
      });

      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  }
);

module.exports = router;

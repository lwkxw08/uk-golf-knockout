const express = require('express');
const { param, body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Get feed posts (public, with optional auth for reaction status)
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('tournamentId').optional().isUUID(),
  query('clubId').optional().isUUID(),
  validate,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const where = {};
      if (req.query.tournamentId) where.tournamentId = req.query.tournamentId;
      if (req.query.clubId) where.clubId = req.query.clubId;

      const [posts, total] = await Promise.all([
        prisma.feedPost.findMany({
          where,
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, homeClub: { select: { name: true } } } },
            match: {
              select: {
                id: true, status: true,
                playerA: { select: { id: true, firstName: true, lastName: true } },
                playerB: { select: { id: true, firstName: true, lastName: true } },
                result: { select: { resultText: true } },
              },
            },
            tournament: { select: { id: true, name: true } },
            club: { select: { id: true, name: true, slug: true } },
            comments: {
              include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
              orderBy: { createdAt: 'asc' },
              take: 5,
            },
            _count: { select: { comments: true, reactions: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.feedPost.count({ where }),
      ]);

      // Get current user's reactions if authenticated
      let userReactions = {};
      const token = req.headers['x-auth-token'];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const { JWT_SECRET } = require('../config');
          const decoded = jwt.verify(token, JWT_SECRET);
          const player = await prisma.player.findUnique({ where: { userId: decoded.userId } });
          if (player) {
            const reactions = await prisma.feedReaction.findMany({
              where: { playerId: player.id, postId: { in: posts.map(p => p.id) } },
            });
            reactions.forEach(r => { userReactions[r.postId] = r.type; });
          }
        } catch {}
      }

      res.json({
        posts: posts.map(p => ({
          ...p,
          userReaction: userReactions[p.id] || null,
          commentCount: p._count.comments,
          reactionCount: p._count.reactions,
        })),
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      console.error('Feed error:', err);
      res.status(500).json({ error: 'Failed to fetch feed' });
    }
  }
);

// Add comment to a post
router.post('/:postId/comments',
  authenticate,
  param('postId').isUUID(),
  body('content').isString().isLength({ min: 1, max: 500 }),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const comment = await prisma.feedComment.create({
        data: {
          postId: req.params.postId,
          playerId: player.id,
          content: req.body.content,
        },
        include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      });

      res.status(201).json(comment);
    } catch (err) {
      console.error('Comment error:', err);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
);

// React to a post (toggle)
router.post('/:postId/reactions',
  authenticate,
  param('postId').isUUID(),
  body('type').optional().isIn(['like', 'clap', 'fire']),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const type = req.body.type || 'like';
      const existing = await prisma.feedReaction.findUnique({
        where: { postId_playerId_type: { postId: req.params.postId, playerId: player.id, type } },
      });

      if (existing) {
        await prisma.feedReaction.delete({ where: { id: existing.id } });
        res.json({ action: 'removed', type });
      } else {
        await prisma.feedReaction.create({
          data: { postId: req.params.postId, playerId: player.id, type },
        });
        res.json({ action: 'added', type });
      }
    } catch (err) {
      console.error('Reaction error:', err);
      res.status(500).json({ error: 'Failed to toggle reaction' });
    }
  }
);

// Get all comments for a post
router.get('/:postId/comments',
  param('postId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const comments = await prisma.feedComment.findMany({
        where: { postId: req.params.postId },
        include: { player: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      });
      res.json(comments);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }
);

module.exports = router;

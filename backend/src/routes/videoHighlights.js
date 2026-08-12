const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Get highlights for a match (public)
router.get('/match/:matchId', async (req, res) => {
  try {
    const highlights = await prisma.videoHighlight.findMany({
      where: { matchId: req.params.matchId },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true, avatarUrl: true } },
        club: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ highlights });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
});

// Get highlights for a club (public)
router.get('/club/:clubId', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const [highlights, total] = await Promise.all([
      prisma.videoHighlight.findMany({
        where: { clubId: req.params.clubId },
        include: {
          match: {
            select: {
              playerA: { select: { firstName: true, lastName: true } },
              playerB: { select: { firstName: true, lastName: true } },
              tournament: { select: { name: true } },
            },
          },
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.videoHighlight.count({ where: { clubId: req.params.clubId } }),
    ]);
    res.json({ highlights, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch club highlights' });
  }
});

// Upload a highlight (club manager or admin)
router.post('/',
  authenticate,
  body('matchId').isUUID(),
  body('title').trim().notEmpty(),
  body('videoUrl').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: req.body.matchId },
        select: { venueClubId: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });

      // Check premium subscription if uploading as club
      if (req.body.clubId) {
        const club = await prisma.clubSubscription.findFirst({
          where: { clubId: req.body.clubId, status: 'ACTIVE' },
          include: { tier: true },
        });
        if (!club || !['professional', 'enterprise'].includes(club.tier?.slug)) {
          return res.status(403).json({ error: 'Video highlights require Professional or Enterprise subscription' });
        }
      }

      const highlight = await prisma.videoHighlight.create({
        data: {
          matchId: req.body.matchId,
          clubId: req.body.clubId || match.venueClubId,
          title: req.body.title,
          videoUrl: req.body.videoUrl,
          thumbnailUrl: req.body.thumbnailUrl || null,
          durationSec: req.body.durationSec || null,
          uploadedById: player?.id || null,
        },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      });
      res.status(201).json(highlight);
    } catch (err) {
      console.error('Highlight upload error:', err);
      res.status(500).json({ error: 'Failed to upload highlight' });
    }
  }
);

// Delete a highlight
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const highlight = await prisma.videoHighlight.findUnique({ where: { id: req.params.id } });
    if (!highlight) return res.status(404).json({ error: 'Not found' });

    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    const isOwner = player && highlight.uploadedById === player.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.videoHighlight.delete({ where: { id: req.params.id } });
    res.json({ message: 'Highlight deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

module.exports = router;

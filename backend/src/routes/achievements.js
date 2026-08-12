const express = require('express');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Full badge catalogue, so locked badges can be shown alongside earned ones
router.get('/', async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({ orderBy: [{ tier: 'asc' }, { name: 'asc' }] });
    res.json({ achievements });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load achievements' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!player) return res.status(404).json({ error: 'Player profile not found' });

    const [all, earned] = await Promise.all([
      prisma.achievement.findMany({ orderBy: [{ tier: 'asc' }, { name: 'asc' }] }),
      prisma.playerAchievement.findMany({ where: { playerId: player.id } }),
    ]);

    const earnedMap = new Map(earned.map((e) => [e.achievementId, e]));
    res.json({
      achievements: all.map((a) => ({
        ...a,
        earned: earnedMap.has(a.id),
        awardedAt: earnedMap.get(a.id)?.awardedAt || null,
      })),
      earnedCount: earned.length,
      totalCount: all.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load achievements' });
  }
});

router.get('/player/:playerId',
  param('playerId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const earned = await prisma.playerAchievement.findMany({
        where: { playerId: req.params.playerId },
        include: { achievement: true },
        orderBy: { awardedAt: 'desc' },
      });
      res.json({ achievements: earned.map((e) => ({ ...e.achievement, awardedAt: e.awardedAt })) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load achievements' });
    }
  }
);

module.exports = router;

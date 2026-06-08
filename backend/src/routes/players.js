const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { validateWhsId, lookupHandicap } = require('../services/whsService');

const router = express.Router();

// Get player profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({
      where: { userId: req.user.id },
      include: {
        homeClub: { select: { id: true, name: true, slug: true } },
        entries: {
          include: {
            tournament: { select: { id: true, name: true, slug: true, status: true, formatType: true } },
            club: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!player) return res.status(404).json({ error: 'Player profile not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update player profile
router.put('/me',
  authenticate,
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('homeClubId').optional().isUUID(),
  body('handicapIndex').optional().isDecimal(),
  body('dateOfBirth').optional().isISO8601(),
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName, phone, dateOfBirth, homeClubId, handicapIndex, whsHandicapId } = req.body;

      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
      if (homeClubId) updateData.homeClubId = homeClubId;
      if (handicapIndex !== undefined) updateData.handicapIndex = handicapIndex;
      if (whsHandicapId !== undefined) updateData.whsHandicapId = whsHandicapId;

      const player = await prisma.player.update({
        where: { userId: req.user.id },
        data: updateData,
        include: { homeClub: { select: { id: true, name: true } } },
      });
      res.json(player);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// WHS handicap lookup
router.get('/whs-lookup/:whsId',
  authenticate,
  param('whsId').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const result = await lookupHandicap(req.params.whsId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Get player's matches
router.get('/me/matches', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ playerAId: player.id }, { playerBId: player.id }],
      },
      include: {
        tournament: { select: { id: true, name: true, formatType: true } },
        playerA: { select: { id: true, firstName: true, lastName: true } },
        playerB: { select: { id: true, firstName: true, lastName: true } },
        venueClub: { select: { id: true, name: true } },
        result: { select: { resultText: true, isConfirmed: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Public: player rankings
router.get('/rankings', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where: { rankingPoints: { gt: 0 } },
        select: {
          id: true, firstName: true, lastName: true,
          handicapIndex: true, rankingPoints: true,
          homeClub: { select: { id: true, name: true } },
        },
        orderBy: { rankingPoints: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.player.count({ where: { rankingPoints: { gt: 0 } } }),
    ]);

    res.json({ players, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

module.exports = router;

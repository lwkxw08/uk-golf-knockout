const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole, requireClubAccess } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Public: list clubs
router.get('/', async (req, res) => {
  try {
    const { region, search, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (region) where.region = { slug: region };
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where,
        include: { region: true, _count: { select: { players: true } } },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.club.count({ where }),
    ]);

    res.json({ clubs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

// Public: get club by slug with full details
router.get('/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      include: {
        region: true,
        sponsors: { where: { isActive: true } },
        players: {
          select: { id: true, firstName: true, lastName: true, handicapIndex: true, rankingPoints: true },
          orderBy: { rankingPoints: 'desc' },
          take: 20,
        },
        _count: { select: { players: true, matches: true } },
      },
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    // Fixtures: upcoming matches at this club
    const fixtures = await prisma.match.findMany({
      where: {
        venueClubId: club.id,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: {
        tournament: { select: { name: true } },
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    });

    // Recent results at this club
    const results = await prisma.match.findMany({
      where: {
        venueClubId: club.id,
        status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] },
      },
      include: {
        tournament: { select: { name: true } },
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
        winner: { select: { firstName: true, lastName: true } },
        result: { select: { resultText: true } },
      },
      orderBy: { playedAt: 'desc' },
      take: 10,
    });

    // Rankings: players from this club
    const rankings = await prisma.player.findMany({
      where: { homeClubId: club.id, rankingPoints: { gt: 0 } },
      select: { id: true, firstName: true, lastName: true, handicapIndex: true, rankingPoints: true },
      orderBy: { rankingPoints: 'desc' },
    });

    // Course offerings
    const offerings = await prisma.courseOffering.findMany({
      where: { clubId: club.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ...club, fixtures, results, rankings, offerings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch club' });
  }
});

// Club manager: get own club dashboard data
router.get('/:clubId/dashboard',
  authenticate,
  param('clubId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { clubId } = req.params;

      // Verify access
      if (req.user.role !== 'ADMIN') {
        const mgr = await prisma.clubManager.findFirst({
          where: { userId: req.user.id, clubId },
        });
        if (!mgr) return res.status(403).json({ error: 'Access denied' });
      }

      const [club, members, entries, matches, revenue, sponsors] = await Promise.all([
        prisma.club.findUnique({ where: { id: clubId }, include: { region: true } }),
        prisma.player.count({ where: { homeClubId: clubId } }),
        prisma.tournamentEntry.count({ where: { clubId } }),
        prisma.match.count({ where: { venueClubId: clubId } }),
        prisma.revenueTransaction.aggregate({
          _sum: { clubAmountPence: true },
          where: { clubId, status: 'COMPLETED' },
        }),
        prisma.sponsor.findMany({ where: { clubId, isActive: true } }),
      ]);

      res.json({
        club,
        stats: {
          members,
          entries,
          matches,
          revenue: revenue._sum.clubAmountPence || 0,
        },
        sponsors,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch club dashboard' });
    }
  }
);

// Admin: create club
router.post('/',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  validate,
  async (req, res) => {
    try {
      const club = await prisma.club.create({ data: req.body });
      res.status(201).json(club);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
      res.status(500).json({ error: 'Failed to create club' });
    }
  }
);

// Admin/Manager: update club
router.put('/:clubId',
  authenticate,
  requireClubAccess,
  param('clubId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const club = await prisma.club.update({ where: { id: clubId }, data: req.body });
      res.json(club);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update club' });
    }
  }
);

module.exports = router;

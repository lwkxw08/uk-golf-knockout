const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// ─── PLATFORM PRICING ───────────────────────────────────────────────────────

router.get('/pricing', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const pricing = await prisma.platformPricing.findMany({
      orderBy: { pricingKey: 'asc' },
    });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

router.put('/pricing/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  body('amountPence').optional().isInt({ min: 0 }),
  validate,
  async (req, res) => {
    try {
      const pricing = await prisma.platformPricing.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(pricing);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  }
);

router.post('/pricing',
  authenticate,
  requireRole('ADMIN'),
  body('pricingKey').trim().notEmpty(),
  body('amountPence').isInt({ min: 0 }),
  body('effectiveFrom').isISO8601(),
  validate,
  async (req, res) => {
    try {
      const pricing = await prisma.platformPricing.create({
        data: {
          ...req.body,
          effectiveFrom: new Date(req.body.effectiveFrom),
          effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : null,
        },
      });
      res.status(201).json(pricing);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Pricing key already exists' });
      res.status(500).json({ error: 'Failed to create pricing' });
    }
  }
);

// ─── REGIONS ────────────────────────────────────────────────────────────────

router.get('/regions', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      include: { _count: { select: { clubs: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(regions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

router.post('/regions',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  validate,
  async (req, res) => {
    try {
      const region = await prisma.region.create({ data: req.body });
      res.status(201).json(region);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Region already exists' });
      res.status(500).json({ error: 'Failed to create region' });
    }
  }
);

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────

router.get('/stats', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [clubs, players, tournaments, activeMatches, revenue] = await Promise.all([
      prisma.club.count({ where: { isActive: true } }),
      prisma.player.count(),
      prisma.tournament.count(),
      prisma.match.count({ where: { status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] } } }),
      prisma.revenueTransaction.aggregate({
        _sum: { totalAmountPence: true, platformAmountPence: true, clubAmountPence: true },
        where: { status: 'COMPLETED' },
      }),
    ]);

    res.json({
      clubs,
      players,
      tournaments,
      activeMatches,
      revenue: {
        total: revenue._sum.totalAmountPence || 0,
        platform: revenue._sum.platformAmountPence || 0,
        clubs: revenue._sum.clubAmountPence || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── USER MANAGEMENT ────────────────────────────────────────────────────────

router.get('/users', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { player: { firstName: { contains: search, mode: 'insensitive' } } },
        { player: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, role: true, isActive: true, createdAt: true,
          player: { select: { firstName: true, lastName: true, homeClub: { select: { name: true } } } },
        },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  body('role').isIn(['ADMIN', 'CLUB_MANAGER', 'PLAYER']),
  validate,
  async (req, res) => {
    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { role: req.body.role },
        select: { id: true, email: true, role: true },
      });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// ─── SPONSORS ───────────────────────────────────────────────────────────────

router.get('/sponsors', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      include: { region: true, club: true, tournament: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sponsors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

router.post('/sponsors',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('tier').isIn(['NATIONAL', 'REGIONAL', 'LOCAL', 'CLUB']),
  validate,
  async (req, res) => {
    try {
      const sponsor = await prisma.sponsor.create({ data: req.body });
      res.status(201).json(sponsor);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create sponsor' });
    }
  }
);

module.exports = router;

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

// Public: get club by slug
router.get('/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      include: {
        region: true,
        sponsors: { where: { isActive: true } },
        _count: { select: { players: true, matches: true } },
      },
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    res.json(club);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch club' });
  }
});

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

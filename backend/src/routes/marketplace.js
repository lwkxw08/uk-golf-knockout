const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole, requireClubAccess } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Public: list offerings with filters
router.get('/', async (req, res) => {
  try {
    const { type, clubId, region, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (type) where.offeringType = type;
    if (clubId) where.clubId = clubId;
    if (region) where.club = { region: { slug: region } };

    const [offerings, total] = await Promise.all([
      prisma.courseOffering.findMany({
        where,
        include: {
          club: { select: { id: true, name: true, slug: true, city: true, county: true, region: true } },
        },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.courseOffering.count({ where }),
    ]);

    res.json({ offerings, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offerings' });
  }
});

// Club manager/Admin: create offering
router.post('/',
  authenticate,
  body('clubId').isUUID(),
  body('offeringType').isIn(['visitor_green_fee', 'society_package', 'membership_offer', 'lesson_package']),
  body('title').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { clubId } = req.body;
      if (req.user.role !== 'ADMIN') {
        const mgr = await prisma.clubManager.findFirst({
          where: { userId: req.user.id, clubId },
        });
        if (!mgr) return res.status(403).json({ error: 'Access denied' });
      }

      const offering = await prisma.courseOffering.create({
        data: {
          clubId: req.body.clubId,
          offeringType: req.body.offeringType,
          title: req.body.title,
          description: req.body.description,
          pricePence: req.body.pricePence,
          originalPricePence: req.body.originalPricePence,
          validFrom: req.body.validFrom ? new Date(req.body.validFrom) : null,
          validTo: req.body.validTo ? new Date(req.body.validTo) : null,
          maxRedemptions: req.body.maxRedemptions,
        },
      });
      res.status(201).json(offering);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create offering' });
    }
  }
);

// Update offering
router.put('/:id',
  authenticate,
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const offering = await prisma.courseOffering.findUnique({ where: { id: req.params.id } });
      if (!offering) return res.status(404).json({ error: 'Not found' });

      if (req.user.role !== 'ADMIN') {
        const mgr = await prisma.clubManager.findFirst({
          where: { userId: req.user.id, clubId: offering.clubId },
        });
        if (!mgr) return res.status(403).json({ error: 'Access denied' });
      }

      const { title, description, pricePence, originalPricePence, validFrom, validTo, maxRedemptions, isActive } = req.body;
      const data = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (pricePence !== undefined) data.pricePence = pricePence;
      if (originalPricePence !== undefined) data.originalPricePence = originalPricePence;
      if (validFrom !== undefined) data.validFrom = validFrom ? new Date(validFrom) : null;
      if (validTo !== undefined) data.validTo = validTo ? new Date(validTo) : null;
      if (maxRedemptions !== undefined) data.maxRedemptions = maxRedemptions;
      if (isActive !== undefined) data.isActive = isActive;

      const updated = await prisma.courseOffering.update({
        where: { id: req.params.id },
        data,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update offering' });
    }
  }
);

// Delete offering
router.delete('/:id',
  authenticate,
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      await prisma.courseOffering.delete({ where: { id: req.params.id } });
      res.json({ message: 'Offering deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete offering' });
    }
  }
);

module.exports = router;

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Get audit logs (admin only)
router.get('/',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, action, entity, userId, from, to, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (userId) where.userId = userId;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }
      if (search) {
        where.OR = [
          { userEmail: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
          { entity: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
      console.error('Audit log fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

// Get distinct actions for filter dropdown
router.get('/actions',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const actions = await prisma.auditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      });
      res.json(actions.map(a => a.action));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch actions' });
    }
  }
);

// Get distinct entities for filter dropdown
router.get('/entities',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const entities = await prisma.auditLog.findMany({
        distinct: ['entity'],
        select: { entity: true },
        orderBy: { entity: 'asc' },
      });
      res.json(entities.map(e => e.entity));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch entities' });
    }
  }
);

module.exports = router;

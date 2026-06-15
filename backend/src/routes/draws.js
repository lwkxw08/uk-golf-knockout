const express = require('express');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { generateKnockoutDraw } = require('../services/drawService');

const router = express.Router();

// Admin: schedule a draw
router.post('/:tournamentId/schedule',
  authenticate,
  requireRole('ADMIN'),
  param('tournamentId').isUUID(),
  body('stage').isIn(['CLUB_QUALIFIER', 'REGIONAL', 'NATIONAL_FINAL']),
  body('roundNumber').isInt({ min: 1 }),
  body('scheduledAt').isISO8601(),
  validate,
  async (req, res) => {
    try {
      const { stage, roundNumber, scheduledAt } = req.body;
      const draw = await prisma.draw.create({
        data: {
          tournamentId: req.params.tournamentId,
          stage,
          roundNumber,
          scheduledAt: new Date(scheduledAt),
        },
      });
      res.status(201).json(draw);
    } catch (err) {
      res.status(500).json({ error: 'Failed to schedule draw' });
    }
  }
);

// Admin: execute draw (can also be triggered by scheduler)
router.post('/:tournamentId/execute',
  authenticate,
  requireRole('ADMIN'),
  param('tournamentId').isUUID(),
  body('stage').isIn(['CLUB_QUALIFIER', 'REGIONAL', 'NATIONAL_FINAL']),
  body('clubId').optional().isUUID(),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { stage, clubId, useSeeding = false } = req.body;

      // Get active entries for this stage
      const where = { tournamentId, status: 'ACTIVE', stage };
      if (clubId) where.clubId = clubId;

      const entries = await prisma.tournamentEntry.findMany({ where });
      if (entries.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 entries for a draw' });
      }

      // Update draw status
      const draw = await prisma.draw.findFirst({
        where: { tournamentId, stage, status: 'SCHEDULED' },
        orderBy: { scheduledAt: 'asc' },
      });
      if (draw) {
        await prisma.draw.update({
          where: { id: draw.id },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });
      }

      // Get Socket.io instance from app
      const io = req.app.get('io');

      // Generate the draw (with optional handicap-based seeding)
      const result = await generateKnockoutDraw(tournamentId, stage, entries, io, { useSeeding });

      // Update draw status
      if (draw) {
        await prisma.draw.update({
          where: { id: draw.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }

      // Emit draw complete event
      if (io) {
        io.to(`draw-${tournamentId}`).emit('draw:complete', {
          tournamentId,
          stage,
          ...result,
        });
      }

      res.json({ message: 'Draw completed', ...result });
    } catch (err) {
      console.error('Execute draw error:', err);
      res.status(500).json({ error: 'Failed to execute draw' });
    }
  }
);

// Get draws for tournament
router.get('/:tournamentId',
  param('tournamentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const draws = await prisma.draw.findMany({
        where: { tournamentId: req.params.tournamentId },
        orderBy: { scheduledAt: 'asc' },
      });
      res.json(draws);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch draws' });
    }
  }
);

module.exports = router;

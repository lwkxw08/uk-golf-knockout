const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { sendEntryConfirmation } = require('../services/emailService');

const router = express.Router();

// Player: enter tournament
router.post('/:tournamentId/enter',
  authenticate,
  param('tournamentId').isUUID(),
  body('clubId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { clubId } = req.body;

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { pricing: { where: { feeType: 'ENTRY_FEE', isActive: true }, take: 1 } },
      });

      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
      if (!['REGISTRATION_OPEN'].includes(tournament.status)) {
        return res.status(400).json({ error: 'Registration is not open' });
      }

      // Age check
      if (tournament.ageCategory !== 'OPEN' && player.dateOfBirth) {
        const age = Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (tournament.ageCategory === 'JUNIOR' && tournament.maxAge && age > tournament.maxAge) {
          return res.status(400).json({ error: `Maximum age for this tournament is ${tournament.maxAge}` });
        }
        if (tournament.ageCategory === 'SENIOR' && tournament.minAge && age < tournament.minAge) {
          return res.status(400).json({ error: `Minimum age for this tournament is ${tournament.minAge}` });
        }
      }

      // Handicap check
      if (tournament.maxHandicap && player.handicapIndex && Number(player.handicapIndex) > Number(tournament.maxHandicap)) {
        return res.status(400).json({ error: `Maximum handicap for this tournament is ${tournament.maxHandicap}` });
      }

      const existing = await prisma.tournamentEntry.findUnique({
        where: { tournamentId_playerId: { tournamentId, playerId: player.id } },
      });
      if (existing) return res.status(409).json({ error: 'Already entered this tournament' });

      const entryFee = tournament.pricing[0];

      const entry = await prisma.tournamentEntry.create({
        data: {
          tournamentId,
          playerId: player.id,
          clubId,
          handicapAtEntry: player.handicapIndex,
          entryFeePaidPence: entryFee?.amountPence || 0,
          paymentStatus: entryFee ? 'PENDING' : 'COMPLETED',
          status: entryFee ? 'PAYMENT_PENDING' : 'ACTIVE',
        },
      });

      // Send confirmation email
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (user && club) {
        sendEntryConfirmation(user.email, player.firstName, tournament.name, club.name).catch(console.error);
      }

      res.status(201).json(entry);
    } catch (err) {
      console.error('Entry error:', err);
      res.status(500).json({ error: 'Failed to enter tournament' });
    }
  }
);

// Get tournament entries (public for leaderboards)
router.get('/:tournamentId/entries', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { clubId, stage, status } = req.query;

    const where = { tournamentId };
    if (clubId) where.clubId = clubId;
    if (stage) where.stage = stage;
    if (status) where.status = status;

    const entries = await prisma.tournamentEntry.findMany({
      where,
      include: {
        player: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
        club: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Player: withdraw from tournament
router.delete('/:tournamentId/withdraw',
  authenticate,
  param('tournamentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const entry = await prisma.tournamentEntry.findUnique({
        where: { tournamentId_playerId: { tournamentId: req.params.tournamentId, playerId: player.id } },
      });
      if (!entry) return res.status(404).json({ error: 'Entry not found' });
      if (['ELIMINATED', 'WITHDRAWN'].includes(entry.status)) {
        return res.status(400).json({ error: 'Already withdrawn or eliminated' });
      }

      await prisma.tournamentEntry.update({
        where: { id: entry.id },
        data: { status: 'WITHDRAWN' },
      });

      res.json({ message: 'Withdrawn from tournament' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to withdraw' });
    }
  }
);

module.exports = router;

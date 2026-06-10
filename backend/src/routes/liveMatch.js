const express = require('express');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Start a live match — sets status to IN_PROGRESS
router.post('/:matchId/start',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { playerA: true, playerB: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can start a match' });
      }
      if (!['PENDING', 'SCHEDULED'].includes(match.status)) {
        return res.status(400).json({ error: 'Match cannot be started in current state' });
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'IN_PROGRESS',
          matchStartedAt: new Date(),
          currentHole: 1,
        },
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
          playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
          tournament: { select: { name: true, formatType: true } },
          venueClub: { select: { name: true } },
        },
      });

      // Emit live event
      const io = req.app.get('io');
      if (io) {
        io.to(`match-${matchId}`).emit('match:started', {
          matchId,
          startedAt: updated.matchStartedAt,
          playerA: updated.playerA,
          playerB: updated.playerB,
        });
      }

      res.json(updated);
    } catch (err) {
      console.error('Start match error:', err);
      res.status(500).json({ error: 'Failed to start match' });
    }
  }
);

// Update hole score live — emits real-time event to spectators
router.post('/:matchId/hole-update',
  authenticate,
  param('matchId').isUUID(),
  body('holeNumber').isInt({ min: 1, max: 18 }),
  body('scores').isObject(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { holeNumber, scores, holeResult } = req.body;
      // scores: { playerAId: 4, playerBId: 5 } (gross scores)

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true } },
          playerB: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.status !== 'IN_PROGRESS') {
        return res.status(400).json({ error: 'Match is not in progress' });
      }

      // Update current hole
      await prisma.match.update({
        where: { id: matchId },
        data: { currentHole: Math.min(holeNumber + 1, 18) },
      });

      // Emit real-time update to spectators
      const io = req.app.get('io');
      if (io) {
        io.to(`match-${matchId}`).emit('match:hole-update', {
          matchId,
          holeNumber,
          scores,
          holeResult: holeResult || null,
          timestamp: new Date().toISOString(),
          currentHole: Math.min(holeNumber + 1, 18),
        });
      }

      res.json({ success: true, holeNumber, currentHole: Math.min(holeNumber + 1, 18) });
    } catch (err) {
      console.error('Hole update error:', err);
      res.status(500).json({ error: 'Failed to update hole' });
    }
  }
);

// Get live match status (public — no auth required)
router.get('/:matchId/live',
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: req.params.matchId },
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true } } } },
          playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true } } } },
          tournament: { select: { id: true, name: true, formatType: true, scoringSystem: true } },
          venueClub: { select: { id: true, name: true } },
          holeScores: { orderBy: [{ holeNumber: 'asc' }] },
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      // Calculate match state from hole scores
      const scoresByHole = {};
      for (const hs of match.holeScores) {
        if (!scoresByHole[hs.holeNumber]) scoresByHole[hs.holeNumber] = {};
        scoresByHole[hs.holeNumber][hs.playerId] = { score: hs.score, putts: hs.putts, fairwayHit: hs.fairwayHit };
      }

      // Calculate matchplay state
      let playerAUp = 0;
      let holesPlayed = 0;
      for (let h = 1; h <= 18; h++) {
        const hole = scoresByHole[h];
        if (!hole || !hole[match.playerAId] || !hole[match.playerBId]) continue;
        holesPlayed++;
        const aScore = hole[match.playerAId].score;
        const bScore = hole[match.playerBId].score;
        if (aScore < bScore) playerAUp++;
        else if (bScore < aScore) playerAUp--;
      }

      res.json({
        match: {
          id: match.id,
          status: match.status,
          currentHole: match.currentHole,
          matchStartedAt: match.matchStartedAt,
          scheduledDate: match.scheduledDate,
          gameWeek: match.gameWeek,
          roundDeadline: match.roundDeadline,
        },
        playerA: match.playerA,
        playerB: match.playerB,
        tournament: match.tournament,
        venue: match.venueClub,
        scoresByHole,
        matchState: {
          holesPlayed,
          playerAUp,
          matchStatus: playerAUp > 0 ? `${match.playerA?.firstName} ${playerAUp} UP` :
                       playerAUp < 0 ? `${match.playerB?.firstName} ${Math.abs(playerAUp)} UP` :
                       'ALL SQUARE',
        },
      });
    } catch (err) {
      console.error('Live match error:', err);
      res.status(500).json({ error: 'Failed to fetch live match' });
    }
  }
);

// Schedule a match date/time (players arrange between themselves)
router.put('/:matchId/schedule',
  authenticate,
  param('matchId').isUUID(),
  body('scheduledDate').isISO8601(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { scheduledDate } = req.body;

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can schedule' });
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          scheduledDate: new Date(scheduledDate),
          status: match.status === 'PENDING' ? 'SCHEDULED' : match.status,
        },
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to schedule match' });
    }
  }
);

// Admin: set round deadline for matches
router.put('/admin/round-deadline',
  authenticate,
  body('tournamentId').isUUID(),
  body('roundNumber').isInt({ min: 1 }),
  body('deadline').isISO8601(),
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin only' });
      }
      const { tournamentId, roundNumber, deadline, gameWeek } = req.body;

      const where = { tournamentId, roundNumber };
      if (gameWeek) where.gameWeek = gameWeek;

      const result = await prisma.match.updateMany({
        where,
        data: { roundDeadline: new Date(deadline) },
      });

      res.json({ updated: result.count, deadline });
    } catch (err) {
      res.status(500).json({ error: 'Failed to set round deadline' });
    }
  }
);

// End match (set to completed with timestamp)
router.post('/:matchId/end',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.status !== 'IN_PROGRESS') {
        return res.status(400).json({ error: 'Match is not in progress' });
      }

      await prisma.match.update({
        where: { id: matchId },
        data: { matchEndedAt: new Date() },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`match-${matchId}`).emit('match:ended', { matchId, endedAt: new Date() });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to end match' });
    }
  }
);

module.exports = router;

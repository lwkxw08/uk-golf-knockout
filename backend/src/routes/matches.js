const express = require('express');
const { param, body } = require('express-validator');
const multer = require('multer');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { uploadScorecard, getScorecardUrl } = require('../services/uploadService');
const { sendResultConfirmation } = require('../services/emailService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Get bracket for tournament stage
router.get('/:tournamentId/bracket',
  param('tournamentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { stage = 'CLUB_QUALIFIER', clubId } = req.query;
      const where = { tournamentId: req.params.tournamentId, stage };

      const matches = await prisma.match.findMany({
        where,
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
          playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
          winner: { select: { id: true, firstName: true, lastName: true } },
          venueClub: { select: { id: true, name: true } },
          result: { select: { resultText: true, isConfirmed: true, scorecardUrl: true } },
        },
        orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
      });

      // Group by round
      const rounds = {};
      for (const m of matches) {
        if (!rounds[m.roundNumber]) rounds[m.roundNumber] = [];
        rounds[m.roundNumber].push(m);
      }

      const totalRounds = Object.keys(rounds).length;
      const roundLabels = {};
      for (let i = 1; i <= totalRounds; i++) {
        if (i === totalRounds) roundLabels[i] = 'Final';
        else if (i === totalRounds - 1) roundLabels[i] = 'Semi-Final';
        else if (i === totalRounds - 2) roundLabels[i] = 'Quarter-Final';
        else roundLabels[i] = `Round ${i}`;
      }

      res.json({ rounds, totalRounds, roundLabels });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch bracket' });
    }
  }
);

// Submit match result with scorecard
router.post('/:matchId/result',
  authenticate,
  upload.single('scorecard'),
  param('matchId').isUUID(),
  body('winnerId').isUUID(),
  body('resultText').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { winnerId, resultText } = req.body;

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { playerA: true, playerB: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      // Verify submitter is a participant
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can submit results' });
      }

      // Verify winner is a participant
      if (winnerId !== match.playerAId && winnerId !== match.playerBId) {
        return res.status(400).json({ error: 'Winner must be a match participant' });
      }

      if (match.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Match result already confirmed' });
      }

      // Upload scorecard if provided
      let scorecardUrl = null;
      if (req.file) {
        const key = await uploadScorecard(req.file, matchId);
        scorecardUrl = key;
      }

      // Create or update result
      const result = await prisma.matchResult.upsert({
        where: { matchId },
        create: {
          matchId,
          resultText,
          scorecardUrl,
          submittedById: player.id,
        },
        update: {
          resultText,
          scorecardUrl: scorecardUrl || undefined,
          submittedById: player.id,
          submittedAt: new Date(),
          isConfirmed: false,
          confirmedById: null,
          confirmedAt: null,
        },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { winnerId, status: 'RESULT_SUBMITTED' },
      });

      // Notify opponent to confirm
      const opponentId = match.playerAId === player.id ? match.playerBId : match.playerAId;
      const opponent = await prisma.player.findUnique({
        where: { id: opponentId },
        include: { user: { select: { email: true } } },
      });
      if (opponent) {
        sendResultConfirmation(opponent.user.email, opponent.firstName, { resultText }).catch(console.error);
      }

      res.json(result);
    } catch (err) {
      console.error('Submit result error:', err);
      res.status(500).json({ error: 'Failed to submit result' });
    }
  }
);

// Confirm match result (opponent sign-off)
router.post('/:matchId/confirm',
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
        include: { result: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can confirm results' });
      }

      if (!match.result) return res.status(400).json({ error: 'No result submitted yet' });
      if (match.result.submittedById === player.id) {
        return res.status(400).json({ error: 'Cannot confirm your own submission' });
      }

      // Confirm result
      await prisma.matchResult.update({
        where: { id: match.result.id },
        data: { isConfirmed: true, confirmedById: player.id, confirmedAt: new Date() },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'COMPLETED', playedAt: new Date() },
      });

      // Advance winner to next match
      if (match.nextMatchId && match.winnerId) {
        const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
        if (nextMatch) {
          const slot = !nextMatch.playerAId ? 'playerAId' : 'playerBId';
          await prisma.match.update({
            where: { id: match.nextMatchId },
            data: { [slot]: match.winnerId },
          });
        }
      }

      // Mark loser as eliminated
      const loserId = match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
      await prisma.tournamentEntry.updateMany({
        where: { tournamentId: match.tournamentId, playerId: loserId },
        data: { status: 'ELIMINATED' },
      });

      res.json({ message: 'Result confirmed, winner advanced' });
    } catch (err) {
      console.error('Confirm result error:', err);
      res.status(500).json({ error: 'Failed to confirm result' });
    }
  }
);

// Dispute match result
router.post('/:matchId/dispute',
  authenticate,
  param('matchId').isUUID(),
  body('reason').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { result: true },
      });
      if (!match || !match.result) return res.status(404).json({ error: 'Match or result not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only participants can dispute' });
      }

      await prisma.matchResult.update({
        where: { id: match.result.id },
        data: { disputeReason: req.body.reason },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'DISPUTED' },
      });

      res.json({ message: 'Dispute submitted for admin review' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit dispute' });
    }
  }
);

// Get signed URL for scorecard viewing
router.get('/:matchId/scorecard',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const result = await prisma.matchResult.findUnique({
        where: { matchId: req.params.matchId },
      });
      if (!result || !result.scorecardUrl) {
        return res.status(404).json({ error: 'No scorecard found' });
      }

      const url = await getScorecardUrl(result.scorecardUrl);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get scorecard' });
    }
  }
);

module.exports = router;

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
          result: { select: { resultText: true, isConfirmed: true, scorecardUrl: true, grossScore: true, netScore: true } },
        },
        orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
      });

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

// Submit match result with scorecard and optional score data
router.post('/:matchId/result',
  authenticate,
  upload.single('scorecard'),
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { winnerId, resultText, grossScore, netScore, stablefordPoints } = req.body;

      if (!winnerId || !resultText) {
        return res.status(400).json({ error: 'winnerId and resultText are required' });
      }

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { playerA: true, playerB: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can submit results' });
      }
      if (winnerId !== match.playerAId && winnerId !== match.playerBId) {
        return res.status(400).json({ error: 'Winner must be a match participant' });
      }
      if (match.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Match result already confirmed' });
      }

      let scorecardUrl = null;
      if (req.file) {
        const key = await uploadScorecard(req.file, matchId);
        scorecardUrl = key;
      }

      const result = await prisma.matchResult.upsert({
        where: { matchId },
        create: {
          matchId,
          resultText,
          grossScore: grossScore ? parseInt(grossScore) : null,
          netScore: netScore ? parseFloat(netScore) : null,
          stablefordPoints: stablefordPoints ? parseInt(stablefordPoints) : null,
          scorecardUrl,
          submittedById: player.id,
        },
        update: {
          resultText,
          grossScore: grossScore ? parseInt(grossScore) : undefined,
          netScore: netScore ? parseFloat(netScore) : undefined,
          stablefordPoints: stablefordPoints ? parseInt(stablefordPoints) : undefined,
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

// Confirm match result (opponent sign-off) — awards ranking points
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
        include: { result: true, tournament: { include: { stages: true } } },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can confirm results' });
      }
      if (!match.result) return res.status(400).json({ error: 'No result submitted yet' });
      if (match.result.submittedById === player.id) {
        return res.status(400).json({ error: 'Cannot confirm your own submission' });
      }

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
        where: { tournamentId: match.tournamentId, playerId: loserId, stage: match.stage },
        data: { status: 'ELIMINATED' },
      });

      // Award ranking points based on round relative to total rounds
      const stageConfig = match.tournament.stages.find(s => s.stage === match.stage);
      if (stageConfig) {
        const totalRoundsInStage = stageConfig.totalRounds;
        const isFinal = match.roundNumber === totalRoundsInStage;
        const isSemiFinal = match.roundNumber === totalRoundsInStage - 1;
        const isQF = match.roundNumber === totalRoundsInStage - 2;

        const pointsTable = {
          NATIONAL_FINAL: { final: { w: 100, l: 50 }, semi: 25, qf: 15, other: 5 },
          REGIONAL: { final: { w: 40, l: 20 }, semi: 10, qf: 5, other: 2 },
          CLUB_QUALIFIER: { final: { w: 15, l: 8 }, semi: 4, qf: 2, other: 1 },
        };
        const pts = pointsTable[match.stage] || pointsTable.CLUB_QUALIFIER;

        if (isFinal && match.winnerId) {
          await prisma.player.update({
            where: { id: match.winnerId },
            data: { rankingPoints: { increment: pts.final.w } },
          });
          if (loserId) {
            await prisma.player.update({
              where: { id: loserId },
              data: { rankingPoints: { increment: pts.final.l } },
            });
          }
        } else if (isSemiFinal && loserId) {
          await prisma.player.update({
            where: { id: loserId },
            data: { rankingPoints: { increment: pts.semi } },
          });
        } else if (isQF && loserId) {
          await prisma.player.update({
            where: { id: loserId },
            data: { rankingPoints: { increment: pts.qf } },
          });
        } else if (loserId) {
          await prisma.player.update({
            where: { id: loserId },
            data: { rankingPoints: { increment: pts.other } },
          });
        }
      }

      // Record score for overall leaderboard if tournament has leaderboard enabled
      if (match.tournament.enableLeaderboard && match.result.grossScore) {
        const winner = await prisma.player.findUnique({
          where: { id: match.winnerId },
          include: { homeClub: true },
        });
        if (winner && winner.homeClub) {
          const club = winner.homeClub;
          const slopeRating = club.slopeRating || 113;
          const courseRating = club.courseRating ? Number(club.courseRating) : 72;
          const par = club.par || 72;
          const handicap = winner.handicapIndex ? Number(winner.handicapIndex) : 0;

          // Course handicap = Handicap Index × (Slope Rating / 113)
          const courseHandicap = Math.round(handicap * (slopeRating / 113));
          const netScore = match.result.grossScore - courseHandicap;
          // Adjusted score = net score normalized to standard slope
          const adjustedScore = netScore + (courseRating - par);

          await prisma.scoreRecord.create({
            data: {
              tournamentId: match.tournamentId,
              playerId: match.winnerId,
              clubId: club.id,
              stage: match.stage,
              grossScore: match.result.grossScore,
              handicapAtPlay: handicap,
              slopeRating,
              courseRating,
              par,
              netScore,
              adjustedScore,
              playedAt: new Date(),
            },
          });
        }
      }

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

// Schedule a match — propose a date
router.post('/:matchId/schedule',
  authenticate,
  param('matchId').isUUID(),
  body('scheduledDate').isISO8601(),
  body('venueClubId').optional().isUUID(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { scheduledDate, venueClubId } = req.body;
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only participants can schedule' });
      }

      const data = {
        scheduledDate: new Date(scheduledDate),
        status: 'SCHEDULED',
      };
      if (venueClubId) data.venueClubId = venueClubId;

      const updated = await prisma.match.update({
        where: { id: matchId },
        data,
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true } },
          playerB: { select: { id: true, firstName: true, lastName: true } },
          venueClub: { select: { id: true, name: true } },
        },
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to schedule match' });
    }
  }
);

module.exports = router;

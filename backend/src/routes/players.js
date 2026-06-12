const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { validateWhsId, lookupHandicap } = require('../services/whsService');

const router = express.Router();

// Get player profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({
      where: { userId: req.user.id },
      include: {
        homeClub: { select: { id: true, name: true, slug: true } },
        entries: {
          include: {
            tournament: { select: { id: true, name: true, slug: true, status: true, formatType: true } },
            club: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        playerMemberships: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { currentPeriodEnd: 'desc' },
        },
      },
    });
    if (!player) return res.status(404).json({ error: 'Player profile not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update player profile
router.put('/me',
  authenticate,
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('homeClubId').optional().isUUID(),
  body('handicapIndex').optional().isDecimal(),
  body('dateOfBirth').optional().isISO8601(),
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName, phone, dateOfBirth, homeClubId, handicapIndex, whsHandicapId } = req.body;

      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
      if (homeClubId) updateData.homeClubId = homeClubId;
      if (handicapIndex !== undefined) updateData.handicapIndex = handicapIndex;
      if (whsHandicapId !== undefined) updateData.whsHandicapId = whsHandicapId;

      const player = await prisma.player.update({
        where: { userId: req.user.id },
        data: updateData,
        include: { homeClub: { select: { id: true, name: true } } },
      });
      res.json(player);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Avatar upload (uses R2 in production, base64 fallback in dev)
router.post('/me/avatar',
  authenticate,
  async (req, res) => {
    try {
      const multer = require('multer');
      const { uploadAvatar } = require('../services/uploadService');
      const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }).single('avatar');

      upload(req, res, async (err) => {
        if (err) return res.status(400).json({ error: 'File too large (max 2MB)' });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const avatarUrl = await uploadAvatar(req.file, player.id);

        await prisma.player.update({
          where: { id: player.id },
          data: { avatarUrl },
        });

        res.json({ avatarUrl });
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  }
);

// WHS handicap lookup
router.get('/whs-lookup/:whsId',
  authenticate,
  param('whsId').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const result = await lookupHandicap(req.params.whsId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Get player's matches
router.get('/me/matches', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ playerAId: player.id }, { playerBId: player.id }],
      },
      include: {
        tournament: { select: { id: true, name: true, formatType: true } },
        playerA: { select: { id: true, firstName: true, lastName: true } },
        playerB: { select: { id: true, firstName: true, lastName: true } },
        venueClub: { select: { id: true, name: true } },
        result: { select: { resultText: true, isConfirmed: true, scorecardUrl: true, submittedById: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Public: player rankings
router.get('/rankings', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where: { rankingPoints: { gt: 0 } },
        select: {
          id: true, firstName: true, lastName: true,
          handicapIndex: true, rankingPoints: true,
          homeClub: { select: { id: true, name: true } },
        },
        orderBy: { rankingPoints: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.player.count({ where: { rankingPoints: { gt: 0 } } }),
    ]);

    res.json({ players, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Public: overall leaderboard (adjusted scores)
router.get('/leaderboard', async (req, res) => {
  try {
    const { tournamentId, page = 1, limit = 50 } = req.query;
    const where = {};
    if (tournamentId) where.tournamentId = tournamentId;

    const scores = await prisma.scoreRecord.findMany({
      where,
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true } } },
        },
        club: { select: { name: true } },
        tournament: { select: { name: true } },
      },
      orderBy: { adjustedScore: 'asc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    });

    const total = await prisma.scoreRecord.count({ where });

    // Group by player for best score
    const bestByPlayer = {};
    for (const s of scores) {
      if (!bestByPlayer[s.playerId] || Number(s.adjustedScore) < Number(bestByPlayer[s.playerId].adjustedScore)) {
        bestByPlayer[s.playerId] = s;
      }
    }

    const leaderboard = Object.values(bestByPlayer).sort(
      (a, b) => Number(a.adjustedScore) - Number(b.adjustedScore)
    );

    res.json({
      leaderboard,
      allScores: scores,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Player stats & performance analytics
router.get('/:playerId/stats',
  param('playerId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { playerId } = req.params;

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true } } },
      });
      if (!player) return res.status(404).json({ error: 'Player not found' });

      // Get all matches
      const matches = await prisma.match.findMany({
        where: {
          OR: [{ playerAId: playerId }, { playerBId: playerId }],
          status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] },
        },
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true } },
          playerB: { select: { id: true, firstName: true, lastName: true } },
          result: true,
          tournament: { select: { name: true, formatType: true, scoringSystem: true } },
          venueClub: { select: { name: true } },
        },
        orderBy: { playedAt: 'desc' },
      });

      // Get hole scores for detailed stats
      const holeScores = await prisma.matchHoleScore.findMany({
        where: { playerId },
        orderBy: [{ matchId: 'asc' }, { holeNumber: 'asc' }],
      });

      // Calculate stats
      let wins = 0, losses = 0, draws = 0;
      const matchHistory = [];

      for (const m of matches) {
        const isPlayerA = m.playerAId === playerId;
        const opponent = isPlayerA ? m.playerB : m.playerA;
        const won = m.winnerId === playerId;
        const halved = !m.winnerId;

        if (won) wins++;
        else if (halved) draws++;
        else losses++;

        matchHistory.push({
          matchId: m.id,
          opponent,
          result: won ? 'WIN' : halved ? 'HALVED' : 'LOSS',
          resultText: m.result?.resultText,
          tournament: m.tournament?.name,
          date: m.playedAt,
          venue: m.venueClub?.name,
          leaguePointsEarned: isPlayerA ? m.leaguePointsA : m.leaguePointsB,
        });
      }

      // Hole-by-hole analytics
      const holeStats = {};
      let totalPutts = 0, puttsCount = 0, fairwaysHit = 0, fairwaysTotal = 0;
      let totalScore = 0, roundCount = 0;

      for (const hs of holeScores) {
        if (!holeStats[hs.holeNumber]) holeStats[hs.holeNumber] = { scores: [], putts: [], fairways: [] };
        holeStats[hs.holeNumber].scores.push(hs.score);
        if (hs.putts != null) { holeStats[hs.holeNumber].putts.push(hs.putts); totalPutts += hs.putts; puttsCount++; }
        if (hs.fairwayHit != null) { holeStats[hs.holeNumber].fairways.push(hs.fairwayHit); fairwaysTotal++; if (hs.fairwayHit) fairwaysHit++; }
        totalScore += hs.score;
      }

      // Best/worst holes by average score
      const holeAverages = Object.entries(holeStats).map(([hole, data]) => ({
        hole: Number(hole),
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        avgPutts: data.putts.length > 0 ? data.putts.reduce((a, b) => a + b, 0) / data.putts.length : null,
        fairwayPct: data.fairways.length > 0 ? (data.fairways.filter(Boolean).length / data.fairways.length * 100) : null,
        timesPlayed: data.scores.length,
      })).sort((a, b) => a.avgScore - b.avgScore);

      // Stableford records
      const scoreRecords = await prisma.scoreRecord.findMany({
        where: { playerId },
        orderBy: { playedAt: 'asc' },
      });

      const handicapTrend = scoreRecords.map(r => ({
        date: r.playedAt,
        handicap: Number(r.handicapAtPlay),
        grossScore: r.grossScore,
        netScore: Number(r.netScore),
        stablefordPoints: r.stablefordPoints,
        adjustedScore: Number(r.adjustedScore),
      }));

      const totalMatches = matches.length;
      const uniqueRounds = new Set(holeScores.map(h => h.matchId)).size;

      res.json({
        player,
        summary: {
          totalMatches,
          wins, losses, draws,
          winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0,
          avgPutts: puttsCount > 0 ? (totalPutts / puttsCount).toFixed(1) : null,
          fairwayPct: fairwaysTotal > 0 ? ((fairwaysHit / fairwaysTotal) * 100).toFixed(1) : null,
          avgScore: uniqueRounds > 0 ? (totalScore / (uniqueRounds * 18) * 18).toFixed(1) : null,
          avgStableford: scoreRecords.length > 0 ? (scoreRecords.reduce((a, r) => a + (r.stablefordPoints || 0), 0) / scoreRecords.length).toFixed(1) : null,
        },
        matchHistory,
        holeAverages,
        bestHoles: holeAverages.slice(0, 3),
        worstHoles: [...holeAverages].reverse().slice(0, 3),
        handicapTrend,
      });
    } catch (err) {
      console.error('Player stats error:', err);
      res.status(500).json({ error: 'Failed to fetch player stats' });
    }
  }
);

// Head-to-head record between two players
router.get('/:playerId/head-to-head/:opponentId',
  param('playerId').isUUID(),
  param('opponentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { playerId, opponentId } = req.params;

      const [player, opponent] = await Promise.all([
        prisma.player.findUnique({ where: { id: playerId }, select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true } } } }),
        prisma.player.findUnique({ where: { id: opponentId }, select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true } } } }),
      ]);

      if (!player || !opponent) return res.status(404).json({ error: 'Player not found' });

      const matches = await prisma.match.findMany({
        where: {
          OR: [
            { playerAId: playerId, playerBId: opponentId },
            { playerAId: opponentId, playerBId: playerId },
          ],
          status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] },
        },
        include: {
          result: true,
          tournament: { select: { name: true, formatType: true } },
          venueClub: { select: { name: true } },
          holeScores: { orderBy: { holeNumber: 'asc' } },
        },
        orderBy: { playedAt: 'desc' },
      });

      let playerWins = 0, opponentWins = 0, halved = 0;
      let totalMargin = 0;
      const matchDetails = [];
      const holeWinCount = {}; // { holeNumber: { player: N, opponent: N, halved: N } }

      for (const m of matches) {
        const isPlayerA = m.playerAId === playerId;
        if (m.winnerId === playerId) playerWins++;
        else if (m.winnerId === opponentId) opponentWins++;
        else halved++;

        if (m.holesUpMargin) {
          totalMargin += m.winnerId === playerId ? m.holesUpMargin : -m.holesUpMargin;
        }

        // Hole-level breakdown
        const holeScoresByHole = {};
        for (const hs of m.holeScores) {
          if (!holeScoresByHole[hs.holeNumber]) holeScoresByHole[hs.holeNumber] = {};
          holeScoresByHole[hs.holeNumber][hs.playerId] = hs.score;
        }

        for (const [hole, scores] of Object.entries(holeScoresByHole)) {
          const pScore = scores[playerId];
          const oScore = scores[opponentId];
          if (pScore == null || oScore == null) continue;
          if (!holeWinCount[hole]) holeWinCount[hole] = { player: 0, opponent: 0, halved: 0 };
          if (pScore < oScore) holeWinCount[hole].player++;
          else if (oScore < pScore) holeWinCount[hole].opponent++;
          else holeWinCount[hole].halved++;
        }

        matchDetails.push({
          matchId: m.id,
          date: m.playedAt,
          tournament: m.tournament?.name,
          venue: m.venueClub?.name,
          resultText: m.result?.resultText,
          winner: m.winnerId === playerId ? 'player' : m.winnerId === opponentId ? 'opponent' : 'halved',
          margin: m.holesUpMargin,
        });
      }

      res.json({
        player,
        opponent,
        summary: {
          totalMatches: matches.length,
          playerWins,
          opponentWins,
          halved,
          avgMargin: matches.length > 0 ? (totalMargin / matches.length).toFixed(1) : 0,
        },
        matchDetails,
        holeAnalysis: Object.entries(holeWinCount).map(([hole, data]) => ({
          hole: Number(hole),
          ...data,
        })).sort((a, b) => a.hole - b.hole),
      });
    } catch (err) {
      console.error('H2H error:', err);
      res.status(500).json({ error: 'Failed to fetch head-to-head' });
    }
  }
);

module.exports = router;

const express = require('express');
const { param, body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');
const {
  DEFAULT_LEAGUE_SCORING,
  generateLeagueFixtures,
  calculateLeaguePoints,
  calculateHolesDifferential,
  recalculateStandings,
  updateClubSeasonPoints,
} = require('../services/leagueService');

const router = express.Router();

// ─── GET LEAGUE STANDINGS ───────────────────────────────────────────────────

router.get('/:tournamentId/standings',
  param('tournamentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { stageId } = req.query;

      const where = { tournamentId };
      if (stageId) where.stageId = stageId;

      const standings = await prisma.leagueStanding.findMany({
        where,
        include: {
          player: {
            select: {
              id: true, firstName: true, lastName: true,
              handicapIndex: true, homeClub: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { position: 'asc' },
      });

      // Get scoring config
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { leagueScoringConfig: true, leagueMatchCount: true },
      });

      res.json({
        standings,
        scoringConfig: tournament?.leagueScoringConfig || DEFAULT_LEAGUE_SCORING,
        matchCount: tournament?.leagueMatchCount || 6,
      });
    } catch (err) {
      console.error('League standings error:', err);
      res.status(500).json({ error: 'Failed to fetch standings' });
    }
  }
);

// ─── GET LEAGUE FIXTURES BY GAME WEEK ───────────────────────────────────────

router.get('/:tournamentId/fixtures',
  param('tournamentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { gameWeek } = req.query;

      const where = {
        tournamentId,
        stage: 'REGIONAL_LEAGUE',
        gameWeek: { not: null },
      };
      if (gameWeek) where.gameWeek = Number(gameWeek);

      const matches = await prisma.match.findMany({
        where,
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true, slug: true } } } },
          playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true, homeClub: { select: { name: true, slug: true } } } },
          venueClub: { select: { name: true, slug: true } },
          result: { select: { resultText: true } },
        },
        orderBy: [{ gameWeek: 'asc' }, { matchNumber: 'asc' }],
      });

      // Group by game week
      const byWeek = {};
      for (const m of matches) {
        if (!byWeek[m.gameWeek]) byWeek[m.gameWeek] = [];
        byWeek[m.gameWeek].push(m);
      }

      res.json({ fixtures: byWeek, matches });
    } catch (err) {
      console.error('League fixtures error:', err);
      res.status(500).json({ error: 'Failed to fetch fixtures' });
    }
  }
);

// ─── GENERATE LEAGUE DRAW (Admin) ──────────────────────────────────────────

router.post('/:tournamentId/generate-draw',
  authenticate,
  requireRole('ADMIN'),
  param('tournamentId').isUUID(),
  body('stageId').isUUID(),
  body('gameWeek').optional().isInt({ min: 1 }),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { stageId, gameWeek } = req.body;

      const stage = await prisma.tournamentStage_.findUnique({
        where: { id: stageId },
        include: { tournament: true },
      });
      if (!stage || !stage.isLeague) {
        return res.status(400).json({ error: 'Stage is not a league stage' });
      }

      // Get all active league entries
      const entries = await prisma.tournamentEntry.findMany({
        where: {
          tournamentId,
          status: { in: ['ACTIVE', 'LEAGUE_ACTIVE'] },
          stage: 'REGIONAL_LEAGUE',
        },
        include: { player: { include: { homeClub: true } } },
      });

      const players = entries.map(e => ({
        id: e.playerId,
        homeClubId: e.player.homeClubId || e.clubId,
      }));

      const matchCount = stage.leagueMatchCount || 6;
      const homeCount = stage.homeMatchCount || 3;

      if (gameWeek) {
        // Generate draw for a specific game week only
        // (future: live draw feature)
        // For now, generate all fixtures at once
      }

      const fixtures = generateLeagueFixtures(players, matchCount, homeCount);

      // Create matches in DB
      let matchNumber = 1;
      const createdMatches = [];

      for (const f of fixtures) {
        const match = await prisma.match.create({
          data: {
            tournamentId,
            stage: 'REGIONAL_LEAGUE',
            roundNumber: f.gameWeek,
            matchNumber: matchNumber++,
            playerAId: f.playerAId,
            playerBId: f.playerBId,
            venueClubId: f.venueClubId,
            gameWeek: f.gameWeek,
            isHomeForPlayerA: f.isHomeForPlayerA,
            status: 'SCHEDULED',
          },
        });
        createdMatches.push(match);
      }

      // Create league standing records for all players
      for (const p of players) {
        const entry = entries.find(e => e.playerId === p.id);
        await prisma.leagueStanding.upsert({
          where: {
            tournamentId_stageId_playerId: {
              tournamentId,
              stageId,
              playerId: p.id,
            },
          },
          create: {
            tournamentId,
            stageId,
            playerId: p.id,
            clubId: entry?.clubId || p.homeClubId,
          },
          update: {},
        });
      }

      // Update entry statuses
      await prisma.tournamentEntry.updateMany({
        where: {
          tournamentId,
          status: 'ACTIVE',
          stage: 'REGIONAL_LEAGUE',
        },
        data: { status: 'LEAGUE_ACTIVE' },
      });

      res.json({
        message: `Generated ${createdMatches.length} league matches across ${matchCount} game weeks`,
        matchCount: createdMatches.length,
        playerCount: players.length,
      });
    } catch (err) {
      console.error('Generate draw error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate league draw' });
    }
  }
);

// ─── SUBMIT LEAGUE MATCH RESULT ─────────────────────────────────────────────

router.post('/:matchId/result',
  authenticate,
  param('matchId').isUUID(),
  body('winnerId').optional({ nullable: true }).isUUID(),
  body('holesUpMargin').isInt({ min: 0, max: 10 }),
  body('holesRemainingMargin').isInt({ min: 0, max: 17 }),
  body('resultText').isString().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { winnerId, holesUpMargin, holesRemainingMargin, resultText } = req.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { tournament: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.stage !== 'REGIONAL_LEAGUE') {
        return res.status(400).json({ error: 'This endpoint is for league matches only' });
      }

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'You are not in this match' });
      }

      // Calculate league points
      const scoringConfig = match.tournament.leagueScoringConfig || DEFAULT_LEAGUE_SCORING;
      const pts = calculateLeaguePoints(
        { winnerId, playerAId: match.playerAId, playerBId: match.playerBId, isHomeForPlayerA: match.isHomeForPlayerA, holesUpMargin, holesRemainingMargin },
        scoringConfig
      );

      // Update match
      await prisma.match.update({
        where: { id: matchId },
        data: {
          winnerId: winnerId || null,
          holesUpMargin,
          holesRemainingMargin,
          leaguePointsA: pts.playerA.points,
          leaguePointsB: pts.playerB.points,
          leagueBonusDetailA: pts.playerA.detail,
          leagueBonusDetailB: pts.playerB.detail,
          status: 'RESULT_SUBMITTED',
        },
      });

      // Create match result
      await prisma.matchResult.upsert({
        where: { matchId },
        create: {
          matchId,
          resultText,
          submittedById: player.id,
        },
        update: {
          resultText,
          submittedById: player.id,
          isConfirmed: false,
          confirmedById: null,
          confirmedAt: null,
        },
      });

      res.json({
        message: 'Result submitted',
        points: { playerA: pts.playerA, playerB: pts.playerB },
      });
    } catch (err) {
      console.error('Submit league result error:', err);
      res.status(500).json({ error: 'Failed to submit result' });
    }
  }
);

// ─── CONFIRM LEAGUE MATCH RESULT ────────────────────────────────────────────

router.post('/:matchId/confirm',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { result: true, tournament: true },
      });
      if (!match || !match.result) return res.status(404).json({ error: 'Match or result not found' });

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player required' });

      // Must be the other player (not the one who submitted)
      if (match.result.submittedById === player.id) {
        return res.status(400).json({ error: 'Cannot confirm your own submission' });
      }
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'You are not in this match' });
      }

      // Confirm
      await prisma.matchResult.update({
        where: { matchId },
        data: {
          isConfirmed: true,
          confirmedById: player.id,
          confirmedAt: new Date(),
        },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          playedAt: new Date(),
        },
      });

      // Recalculate standings
      const stage = await prisma.tournamentStage_.findFirst({
        where: { tournamentId: match.tournamentId, stage: 'REGIONAL_LEAGUE' },
      });

      if (stage) {
        const config = match.tournament.leagueScoringConfig || DEFAULT_LEAGUE_SCORING;
        await recalculateStandings(match.tournamentId, stage.id, config);
        await updateClubSeasonPoints(match.tournament.season);
      }

      res.json({ message: 'Result confirmed, standings updated' });
    } catch (err) {
      console.error('Confirm league result error:', err);
      res.status(500).json({ error: 'Failed to confirm result' });
    }
  }
);

// ─── DISPUTE LEAGUE MATCH RESULT ────────────────────────────────────────────

router.post('/:matchId/dispute',
  authenticate,
  param('matchId').isUUID(),
  body('reason').isString().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { reason } = req.body;

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player required' });

      await prisma.matchResult.update({
        where: { matchId },
        data: { disputeReason: reason },
      });
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'DISPUTED' },
      });

      res.json({ message: 'Dispute submitted' });
    } catch (err) {
      console.error('Dispute error:', err);
      res.status(500).json({ error: 'Failed to submit dispute' });
    }
  }
);

// ─── ADMIN: RESOLVE DISPUTE ─────────────────────────────────────────────────

router.post('/:matchId/resolve',
  authenticate,
  requireRole('ADMIN'),
  param('matchId').isUUID(),
  body('winnerId').optional({ nullable: true }).isUUID(),
  body('holesUpMargin').isInt({ min: 0, max: 10 }),
  body('holesRemainingMargin').isInt({ min: 0, max: 17 }),
  body('resultText').isString().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { winnerId, holesUpMargin, holesRemainingMargin, resultText } = req.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { tournament: true },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      const scoringConfig = match.tournament.leagueScoringConfig || DEFAULT_LEAGUE_SCORING;
      const pts = calculateLeaguePoints(
        { winnerId, playerAId: match.playerAId, playerBId: match.playerBId, isHomeForPlayerA: match.isHomeForPlayerA, holesUpMargin, holesRemainingMargin },
        scoringConfig
      );

      await prisma.match.update({
        where: { id: matchId },
        data: {
          winnerId: winnerId || null,
          holesUpMargin,
          holesRemainingMargin,
          leaguePointsA: pts.playerA.points,
          leaguePointsB: pts.playerB.points,
          leagueBonusDetailA: pts.playerA.detail,
          leagueBonusDetailB: pts.playerB.detail,
          status: 'COMPLETED',
          playedAt: new Date(),
        },
      });

      await prisma.matchResult.update({
        where: { matchId },
        data: {
          resultText,
          isConfirmed: true,
          confirmedAt: new Date(),
          disputeReason: null,
        },
      });

      // Recalculate
      const stage = await prisma.tournamentStage_.findFirst({
        where: { tournamentId: match.tournamentId, stage: 'REGIONAL_LEAGUE' },
      });
      if (stage) {
        await recalculateStandings(match.tournamentId, stage.id, scoringConfig);
        await updateClubSeasonPoints(match.tournament.season);
      }

      res.json({ message: 'Dispute resolved, standings updated', points: { playerA: pts.playerA, playerB: pts.playerB } });
    } catch (err) {
      console.error('Resolve error:', err);
      res.status(500).json({ error: 'Failed to resolve dispute' });
    }
  }
);

// ─── CLUB POINTS CHAMPIONSHIP ───────────────────────────────────────────────

router.get('/club-points/:season',
  async (req, res) => {
    try {
      const { season } = req.params;
      const { regionId } = req.query;

      const where = { season };
      if (regionId) where.regionId = regionId;

      const clubPoints = await prisma.clubSeasonPoints.findMany({
        where,
        include: {
          club: { select: { id: true, name: true, slug: true, logoUrl: true } },
          region: { select: { id: true, name: true } },
        },
        orderBy: { position: 'asc' },
      });

      res.json(clubPoints);
    } catch (err) {
      console.error('Club points error:', err);
      res.status(500).json({ error: 'Failed to fetch club points' });
    }
  }
);

module.exports = router;

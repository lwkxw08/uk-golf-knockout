const express = require('express');
const { param, body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');
const {
  DEFAULT_LEAGUE_SCORING,
  generateLeagueFixtures,
  generateSingleWeekFixtures,
  calculateLeaguePoints,
  calculateHolesDifferential,
  recalculateStandings,
  updateClubSeasonPoints,
} = require('../services/leagueService');
const { sendDrawDayAnnouncement, sendLeagueFixtureNotification } = require('../services/emailService');

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

// ─── SCHEDULE LIVE LEAGUE DRAW ──────────────────────────────────────────────

router.post('/:tournamentId/schedule-draw',
  authenticate,
  requireRole('ADMIN'),
  param('tournamentId').isUUID(),
  body('stageId').isUUID(),
  body('scheduledAt').isISO8601(),
  body('gameWeek').isInt({ min: 1, max: 6 }),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { stageId, scheduledAt, gameWeek } = req.body;

      const stage = await prisma.tournamentStage_.findUnique({ where: { id: stageId } });
      if (!stage || !stage.isLeague) {
        return res.status(400).json({ error: 'Stage is not a league stage' });
      }

      // Check if this week already has a draw scheduled
      const existing = await prisma.draw.findFirst({
        where: { tournamentId, stage: 'REGIONAL_LEAGUE', roundNumber: gameWeek },
      });

      let draw;
      if (existing) {
        draw = await prisma.draw.update({
          where: { id: existing.id },
          data: { scheduledAt: new Date(scheduledAt), status: 'SCHEDULED', startedAt: null, completedAt: null },
        });
      } else {
        draw = await prisma.draw.create({
          data: {
            tournamentId,
            stage: 'REGIONAL_LEAGUE',
            roundNumber: gameWeek,
            scheduledAt: new Date(scheduledAt),
          },
        });
      }

      // Store stageId in tournament metadata for draw reference
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { leagueDrawStageId: stageId },
      });

      // Send draw day announcement emails to all entered players
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { name: true },
      });
      const entries = await prisma.tournamentEntry.findMany({
        where: { tournamentId },
        include: { player: { select: { firstName: true, lastName: true, user: { select: { email: true } } } } },
      });
      for (const entry of entries) {
        const email = entry.player?.user?.email;
        if (!email) continue;
        sendDrawDayAnnouncement(
          email,
          `${entry.player.firstName} ${entry.player.lastName}`,
          tournament.name,
          scheduledAt,
        ).catch(err => console.error('Draw announcement email error:', err));
      }

      res.status(201).json(draw);
    } catch (err) {
      console.error('Schedule draw error:', err);
      res.status(500).json({ error: 'Failed to schedule draw' });
    }
  }
);

// ─── GET LEAGUE DRAW STATUS ─────────────────────────────────────────────────

router.get('/:tournamentId/draw-status',
  param('tournamentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;

      // Get all per-week draw records
      const draws = await prisma.draw.findMany({
        where: { tournamentId, stage: 'REGIONAL_LEAGUE' },
        orderBy: { roundNumber: 'asc' },
      });

      // Check which game weeks already have fixtures
      const revealedWeeks = await prisma.match.findMany({
        where: { tournamentId, stage: 'REGIONAL_LEAGUE', gameWeek: { not: null } },
        select: { gameWeek: true },
        distinct: ['gameWeek'],
      });
      const revealedWeekNums = revealedWeeks.map(w => w.gameWeek).sort((a, b) => a - b);

      // Build per-week status map
      const weekDraws = draws.map(d => ({
        ...d,
        gameWeek: d.roundNumber,
        hasFixtures: revealedWeekNums.includes(d.roundNumber),
      }));

      // Find the next upcoming draw (SCHEDULED, earliest scheduledAt)
      const nextDraw = draws.find(d => d.status === 'SCHEDULED');

      // Legacy: compute overall status for backward compatibility
      const allCompleted = weekDraws.length > 0 && weekDraws.every(d => d.status === 'COMPLETED');
      const anyScheduled = weekDraws.some(d => d.status === 'SCHEDULED');
      const overallStatus = weekDraws.length === 0 ? 'NOT_SCHEDULED'
        : allCompleted ? 'COMPLETED'
        : anyScheduled ? 'SCHEDULED'
        : 'NOT_SCHEDULED';

      res.json({
        status: overallStatus,
        draw: nextDraw || draws[0] || null,
        revealedWeeks: revealedWeekNums,
        weekDraws,
      });
    } catch (err) {
      console.error('Draw status error:', err);
      res.status(500).json({ error: 'Failed to fetch draw status' });
    }
  }
);

// ─── EXECUTE LIVE LEAGUE DRAW (with Socket.io) ─────────────────────────────

router.post('/:tournamentId/execute-live-draw',
  authenticate,
  requireRole('ADMIN'),
  param('tournamentId').isUUID(),
  body('stageId').isUUID(),
  body('gameWeek').isInt({ min: 1, max: 6 }),
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

      // Check this week doesn't already have fixtures
      const existingWeekMatches = await prisma.match.findFirst({
        where: { tournamentId, stage: 'REGIONAL_LEAGUE', gameWeek },
      });
      if (existingWeekMatches) {
        return res.status(400).json({ error: `Game Week ${gameWeek} already has fixtures. Use regenerate to replace them.` });
      }

      // Get entries
      const entries = await prisma.tournamentEntry.findMany({
        where: {
          tournamentId,
          status: { in: ['ACTIVE', 'LEAGUE_ACTIVE'] },
          stage: 'REGIONAL_LEAGUE',
        },
        include: {
          player: {
            include: { homeClub: { select: { id: true, name: true } } },
          },
        },
      });

      const players = entries.map(e => ({
        id: e.playerId,
        homeClubId: e.player.homeClubId || e.clubId,
        firstName: e.player.firstName,
        lastName: e.player.lastName,
        handicapIndex: e.player.handicapIndex,
        clubName: e.player.homeClub?.name,
      }));

      if (players.length < 7) {
        return res.status(400).json({ error: `Need at least 7 players. Got ${players.length}.` });
      }

      const matchCount = stage.leagueMatchCount || 6;
      const homeCount = stage.homeMatchCount || 3;

      // Fetch ALL existing matches (other weeks) so the algorithm accounts for them
      const existingDbMatches = await prisma.match.findMany({
        where: { tournamentId, stage: 'REGIONAL_LEAGUE', gameWeek: { not: null } },
        select: { gameWeek: true, playerAId: true, playerBId: true, isHomeForPlayerA: true, matchNumber: true },
      });

      const existingMatches = existingDbMatches.map(m => ({
        gameWeek: m.gameWeek,
        playerAId: m.playerAId,
        playerBId: m.playerBId,
        isHomeForPlayerA: m.isHomeForPlayerA,
      }));

      // Find highest existing match number
      const maxExistingMatchNum = existingDbMatches.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0);

      // Update this week's draw status to IN_PROGRESS
      const draw = await prisma.draw.findFirst({
        where: { tournamentId, stage: 'REGIONAL_LEAGUE', roundNumber: gameWeek },
      });
      if (draw) {
        await prisma.draw.update({
          where: { id: draw.id },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });
      }

      const io = req.app.get('io');

      // Emit draw starting event
      if (io) {
        io.to(`draw-${tournamentId}`).emit('league-draw:starting', {
          tournamentId,
          playerCount: players.length,
          gameWeek,
        });
      }

      // Generate fixtures for this single week
      const weekFixtures = generateSingleWeekFixtures(players, gameWeek, matchCount, homeCount, existingMatches);

      // Emit week announcement
      if (io) {
        io.to(`draw-${tournamentId}`).emit('league-draw:week-announce', {
          gameWeek,
          totalWeeks: matchCount,
          matchCount: weekFixtures.length,
        });
        await new Promise(r => setTimeout(r, 2000));
      }

      // Create matches and reveal each one
      let matchNumber = maxExistingMatchNum + 1;
      const createdMatches = [];

      for (const f of weekFixtures) {
        const playerA = players.find(p => p.id === f.playerAId);
        const playerB = players.find(p => p.id === f.playerBId);

        const match = await prisma.match.create({
          data: {
            tournamentId,
            stage: 'REGIONAL_LEAGUE',
            roundNumber: gameWeek,
            matchNumber: matchNumber++,
            playerAId: f.playerAId,
            playerBId: f.playerBId,
            venueClubId: f.venueClubId,
            gameWeek,
            isHomeForPlayerA: f.isHomeForPlayerA,
            status: 'SCHEDULED',
          },
        });
        createdMatches.push(match);

        // Emit each fixture reveal
        if (io) {
          io.to(`draw-${tournamentId}`).emit('league-draw:fixture', {
            gameWeek,
            matchId: match.id,
            home: {
              id: playerA?.id,
              name: `${playerA?.firstName} ${playerA?.lastName}`,
              handicap: playerA?.handicapIndex,
              club: playerA?.clubName,
            },
            away: {
              id: playerB?.id,
              name: `${playerB?.firstName} ${playerB?.lastName}`,
              handicap: playerB?.handicapIndex,
              club: playerB?.clubName,
            },
            venue: playerA?.clubName,
          });
          await new Promise(r => setTimeout(r, 1200));
        }
      }

      // Emit week complete
      if (io) {
        io.to(`draw-${tournamentId}`).emit('league-draw:week-complete', {
          gameWeek,
          totalWeeks: matchCount,
        });
      }

      // Create league standings for all players
      for (const p of players) {
        const entry = entries.find(e => e.playerId === p.id);
        await prisma.leagueStanding.upsert({
          where: {
            tournamentId_stageId_playerId: { tournamentId, stageId, playerId: p.id },
          },
          create: {
            tournamentId, stageId, playerId: p.id,
            clubId: entry?.clubId || p.homeClubId,
          },
          update: {},
        });
      }

      // Update this week's draw status to COMPLETED
      if (draw) {
        await prisma.draw.update({
          where: { id: draw.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }

      // Emit draw complete
      if (io) {
        io.to(`draw-${tournamentId}`).emit('league-draw:complete', {
          tournamentId,
          gameWeek,
          totalMatches: createdMatches.length,
        });
      }

      // Send fixture notification emails (async)
      for (const m of createdMatches) {
        const pA = players.find(p => p.id === m.playerAId);
        const pB = players.find(p => p.id === m.playerBId);
        const entryA = entries.find(e => e.playerId === m.playerAId);
        const entryB = entries.find(e => e.playerId === m.playerBId);
        const emailA = entryA?.player?.user?.email;
        const emailB = entryB?.player?.user?.email;
        if (emailA) {
          sendLeagueFixtureNotification(
            emailA, `${pA.firstName} ${pA.lastName}`, stage.tournament.name,
            [{ gameWeek, opponent: `${pB.firstName} ${pB.lastName}`, isHome: true, venue: pA.clubName }],
          ).catch(err => console.error('Fixture email error:', err));
        }
        if (emailB) {
          sendLeagueFixtureNotification(
            emailB, `${pB.firstName} ${pB.lastName}`, stage.tournament.name,
            [{ gameWeek, opponent: `${pA.firstName} ${pA.lastName}`, isHome: false, venue: pA.clubName }],
          ).catch(err => console.error('Fixture email error:', err));
        }
      }

      res.json({
        message: `Game Week ${gameWeek} draw completed — ${createdMatches.length} matches generated`,
        matchCount: createdMatches.length,
        playerCount: players.length,
        gameWeek,
      });
    } catch (err) {
      console.error('Live draw error:', err);
      res.status(500).json({ error: err.message || 'Failed to execute live draw' });
    }
  }
);

// ─── REGENERATE GAME WEEK (Admin) ───────────────────────────────────────────

router.post('/:tournamentId/regenerate-week',
  authenticate,
  requireRole('ADMIN'),
  param('tournamentId').isUUID(),
  body('gameWeek').isInt({ min: 1, max: 6 }),
  body('stageId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { gameWeek, stageId } = req.body;

      // Check no matches in this week have been played
      const playedMatches = await prisma.match.count({
        where: {
          tournamentId, gameWeek, stage: 'REGIONAL_LEAGUE',
          status: { in: ['COMPLETED', 'RESULT_CONFIRMED', 'RESULT_SUBMITTED'] },
        },
      });
      if (playedMatches > 0) {
        return res.status(400).json({ error: `Cannot regenerate game week ${gameWeek} — ${playedMatches} match(es) already have results` });
      }

      // Delete existing matches for this week
      await prisma.match.deleteMany({
        where: { tournamentId, gameWeek, stage: 'REGIONAL_LEAGUE' },
      });

      // Get current fixture state (other weeks' opponents)
      const existingMatches = await prisma.match.findMany({
        where: { tournamentId, stage: 'REGIONAL_LEAGUE', gameWeek: { not: gameWeek } },
        select: { playerAId: true, playerBId: true, isHomeForPlayerA: true, gameWeek: true },
      });

      // Get all players in the league
      const standings = await prisma.leagueStanding.findMany({
        where: { tournamentId, stageId },
        include: { player: { select: { id: true, homeClubId: true } } },
      });

      const players = standings.map(s => ({
        id: s.playerId,
        homeClubId: s.player.homeClubId || s.clubId,
      }));

      // Build constraints from existing matches
      const opponents = {};
      const homePlayed = {};
      const awayPlayed = {};
      const weekMatches = {};

      for (const p of players) {
        opponents[p.id] = new Set();
        homePlayed[p.id] = 0;
        awayPlayed[p.id] = 0;
        weekMatches[p.id] = new Set();
      }

      for (const m of existingMatches) {
        if (m.playerAId && m.playerBId) {
          opponents[m.playerAId]?.add(m.playerBId);
          opponents[m.playerBId]?.add(m.playerAId);
          if (m.isHomeForPlayerA) {
            homePlayed[m.playerAId] = (homePlayed[m.playerAId] || 0) + 1;
            awayPlayed[m.playerBId] = (awayPlayed[m.playerBId] || 0) + 1;
          } else {
            awayPlayed[m.playerAId] = (awayPlayed[m.playerAId] || 0) + 1;
            homePlayed[m.playerBId] = (homePlayed[m.playerBId] || 0) + 1;
          }
          weekMatches[m.playerAId]?.add(m.gameWeek);
          weekMatches[m.playerBId]?.add(m.gameWeek);
        }
      }

      // Generate just this week's fixtures respecting existing constraints
      const { generateGameWeekConstrained } = require('../services/leagueService');
      const weekFixtures = generateGameWeekConstrained(
        players, gameWeek, opponents, homePlayed, awayPlayed,
        weekMatches, 3, 3
      );

      if (!weekFixtures || weekFixtures.length === 0) {
        return res.status(400).json({ error: 'Could not generate valid fixtures for this week with current constraints' });
      }

      // Get max match number
      const maxMatch = await prisma.match.aggregate({
        _max: { matchNumber: true },
        where: { tournamentId, stage: 'REGIONAL_LEAGUE' },
      });
      let matchNumber = (maxMatch._max.matchNumber || 0) + 1;

      const createdMatches = [];
      for (const f of weekFixtures) {
        const match = await prisma.match.create({
          data: {
            tournamentId, stage: 'REGIONAL_LEAGUE',
            roundNumber: gameWeek, matchNumber: matchNumber++,
            playerAId: f.playerAId, playerBId: f.playerBId,
            venueClubId: f.venueClubId, gameWeek,
            isHomeForPlayerA: f.isHomeForPlayerA, status: 'SCHEDULED',
          },
        });
        createdMatches.push(match);
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`draw-${tournamentId}`).emit('league-draw:week-regenerated', {
          gameWeek,
          matchCount: createdMatches.length,
        });
      }

      res.json({
        message: `Regenerated ${createdMatches.length} fixtures for game week ${gameWeek}`,
        matchCount: createdMatches.length,
      });
    } catch (err) {
      console.error('Regenerate week error:', err);
      res.status(500).json({ error: err.message || 'Failed to regenerate game week' });
    }
  }
);

module.exports = router;

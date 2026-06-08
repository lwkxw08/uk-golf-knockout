const express = require('express');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Default stableford points table
const DEFAULT_STABLEFORD = {
  doubleBogeyOrWorse: 0,
  bogey: 1,
  par: 2,
  birdie: 3,
  eagle: 4,
  albatross: 5,
};

/**
 * Calculate course handicap from handicap index and slope rating
 * Formula: Course Handicap = Handicap Index × (Slope Rating / 113)
 */
function calcCourseHandicap(handicapIndex, slopeRating) {
  return Math.round(handicapIndex * (slopeRating / 113));
}

/**
 * Calculate playing handicap with tournament allowance
 */
function calcPlayingHandicap(courseHandicap, allowancePct) {
  return Math.round(courseHandicap * (allowancePct / 100));
}

/**
 * Distribute handicap strokes across holes by stroke index.
 * Returns array of extra strokes per hole (indexed 1-18).
 * A playing handicap of 20 means: 1 stroke on all 18 holes + 2 extra on SI 1-2.
 */
function distributeStrokes(playingHandicap, holes) {
  const strokes = {};
  for (let i = 1; i <= 18; i++) strokes[i] = 0;

  if (playingHandicap <= 0 || !holes?.length) return strokes;

  // Sort holes by stroke index (ascending)
  const sorted = [...holes]
    .filter(h => h.strokeIndex)
    .sort((a, b) => a.strokeIndex - b.strokeIndex);

  let remaining = playingHandicap;
  // Distribute full rounds of 18 first
  const fullRounds = Math.floor(remaining / 18);
  for (const h of sorted) {
    strokes[h.holeNumber] = fullRounds;
  }
  remaining -= fullRounds * 18;

  // Distribute remaining strokes by SI order
  for (const h of sorted) {
    if (remaining <= 0) break;
    strokes[h.holeNumber]++;
    remaining--;
  }

  return strokes;
}

/**
 * Calculate stableford points for a hole.
 * netScore = gross score - extra strokes on that hole
 * Then compare netScore to par.
 */
function calcStablefordPoints(grossScore, par, extraStrokes, config) {
  const netScore = grossScore - extraStrokes;
  const diff = netScore - par; // negative = under par

  if (diff <= -3) return config.albatross || 5;
  if (diff === -2) return config.eagle || 4;
  if (diff === -1) return config.birdie || 3;
  if (diff === 0) return config.par || 2;
  if (diff === 1) return config.bogey || 1;
  return config.doubleBogeyOrWorse ?? 0;
}

/**
 * Calculate matchplay hole result.
 * Returns: 'A' if playerA wins, 'B' if playerB wins, 'H' if halved
 */
function matchplayHoleResult(scoreA, scoreB, extraStrokesA, extraStrokesB) {
  const netA = scoreA - extraStrokesA;
  const netB = scoreB - extraStrokesB;
  if (netA < netB) return 'A';
  if (netB < netA) return 'B';
  return 'H';
}

/**
 * Calculate matchplay result text from hole results.
 * e.g. "3&2", "1 up", "All Square" (for dormie situations we check remaining holes)
 */
function calcMatchplayResult(holeResults) {
  let aUp = 0;
  const totalHoles = holeResults.length;

  for (let i = 0; i < totalHoles; i++) {
    if (holeResults[i] === 'A') aUp++;
    else if (holeResults[i] === 'B') aUp--;

    const holesRemaining = totalHoles - i - 1;
    const lead = Math.abs(aUp);

    // Match won if lead > remaining holes
    if (lead > holesRemaining && holesRemaining > 0) {
      return {
        winner: aUp > 0 ? 'A' : 'B',
        text: `${lead}&${holesRemaining}`,
        decidedAtHole: i + 1,
      };
    }
  }

  if (aUp === 0) return { winner: null, text: 'All Square', decidedAtHole: totalHoles };
  return {
    winner: aUp > 0 ? 'A' : 'B',
    text: `${Math.abs(aUp)} up`,
    decidedAtHole: totalHoles,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Submit hole-by-hole scores for a match
// ──────────────────────────────────────────────────────────────────────────────

router.post('/:matchId/scores',
  authenticate,
  param('matchId').isUUID(),
  body('scores').isArray({ min: 1, max: 18 }),
  body('scores.*.holeNumber').isInt({ min: 1, max: 18 }),
  body('scores.*.score').isInt({ min: 1, max: 20 }),
  body('scores.*.putts').optional().isInt({ min: 0, max: 10 }),
  body('scores.*.fairwayHit').optional().isBoolean(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { scores } = req.body;

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          tournament: { include: { tournamentTees: { include: { clubTee: { include: { holes: true } } } } } },
          holeScores: true,
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only match participants can submit scores' });
      }

      // Check if player already submitted
      const existingScores = match.holeScores.filter(s => s.playerId === player.id);
      if (existingScores.length > 0) {
        return res.status(400).json({ error: 'You have already submitted scores for this match. Use the update endpoint to modify.' });
      }

      // Save hole scores
      await prisma.matchHoleScore.createMany({
        data: scores.map(s => ({
          matchId,
          playerId: player.id,
          holeNumber: s.holeNumber,
          score: s.score,
          putts: s.putts ?? null,
          fairwayHit: s.fairwayHit ?? null,
        })),
      });

      // Check if both players have submitted
      const opponentId = match.playerAId === player.id ? match.playerBId : match.playerAId;
      const opponentScores = match.holeScores.filter(s => s.playerId === opponentId);

      if (opponentScores.length > 0) {
        // Both have submitted — compare scores
        const comparison = await compareScores(match, player.id, opponentId);
        return res.json({
          message: 'Scores submitted. Both players have submitted — comparison ready.',
          comparison,
          status: 'BOTH_SUBMITTED',
        });
      }

      res.json({
        message: 'Scores submitted. Waiting for opponent to submit.',
        status: 'AWAITING_OPPONENT',
      });
    } catch (err) {
      console.error('Submit scores error:', err);
      res.status(500).json({ error: 'Failed to submit scores' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Update previously submitted scores
// ──────────────────────────────────────────────────────────────────────────────

router.put('/:matchId/scores',
  authenticate,
  param('matchId').isUUID(),
  body('scores').isArray({ min: 1, max: 18 }),
  body('scores.*.holeNumber').isInt({ min: 1, max: 18 }),
  body('scores.*.score').isInt({ min: 1, max: 20 }),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { scores } = req.body;

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.status === 'COMPLETED') return res.status(400).json({ error: 'Match already completed' });

      // Upsert each score
      for (const s of scores) {
        await prisma.matchHoleScore.upsert({
          where: { matchId_playerId_holeNumber: { matchId, playerId: player.id, holeNumber: s.holeNumber } },
          update: { score: s.score, putts: s.putts ?? null, fairwayHit: s.fairwayHit ?? null },
          create: { matchId, playerId: player.id, holeNumber: s.holeNumber, score: s.score, putts: s.putts ?? null, fairwayHit: s.fairwayHit ?? null },
        });
      }

      res.json({ message: 'Scores updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update scores' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Get score comparison for a match (both players' hole-by-hole with calculations)
// ──────────────────────────────────────────────────────────────────────────────

router.get('/:matchId/scores',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          tournament: {
            include: {
              tournamentTees: { include: { clubTee: { include: { holes: { orderBy: { holeNumber: 'asc' } } } } } },
            },
          },
          playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
          playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
          holeScores: { orderBy: [{ holeNumber: 'asc' }] },
          venueClub: { include: { tees: { include: { holes: { orderBy: { holeNumber: 'asc' } } } } } },
        },
      });

      if (!match) return res.status(404).json({ error: 'Match not found' });

      // Get tee data — prefer tournament tee, fall back to venue club's first tee
      let teeData = null;
      if (match.tournament.tournamentTees?.length > 0) {
        teeData = match.tournament.tournamentTees[0].clubTee;
      } else if (match.venueClub?.tees?.length > 0) {
        teeData = match.venueClub.tees[0];
      }

      const stablefordConfig = match.tournament.stablefordConfig || DEFAULT_STABLEFORD;
      const allowancePct = match.tournament.handicapAllowancePct || 100;

      const playerAScores = match.holeScores.filter(s => s.playerId === match.playerAId);
      const playerBScores = match.holeScores.filter(s => s.playerId === match.playerBId);

      // Calculate handicap data
      const slopeRating = teeData?.slopeRating || 113;
      const courseRating = teeData?.courseRating ? Number(teeData.courseRating) : 72;
      const holes = teeData?.holes || [];

      const handicapA = match.playerA?.handicapIndex ? Number(match.playerA.handicapIndex) : 0;
      const handicapB = match.playerB?.handicapIndex ? Number(match.playerB.handicapIndex) : 0;
      const courseHcpA = calcCourseHandicap(handicapA, slopeRating);
      const courseHcpB = calcCourseHandicap(handicapB, slopeRating);
      const playingHcpA = calcPlayingHandicap(courseHcpA, allowancePct);
      const playingHcpB = calcPlayingHandicap(courseHcpB, allowancePct);
      const strokesA = distributeStrokes(playingHcpA, holes);
      const strokesB = distributeStrokes(playingHcpB, holes);

      // Build hole-by-hole comparison
      const holeComparison = [];
      const holeResults = [];
      let grossA = 0, grossB = 0, netA = 0, netB = 0, stablefordA = 0, stablefordB = 0;
      let mismatches = [];

      for (let h = 1; h <= 18; h++) {
        const holeData = holes.find(x => x.holeNumber === h);
        const par = holeData?.par || 4;
        const si = holeData?.strokeIndex || h;
        const scoreA = playerAScores.find(s => s.holeNumber === h);
        const scoreB = playerBScores.find(s => s.holeNumber === h);

        const entry = {
          holeNumber: h,
          par,
          strokeIndex: si,
          yards: holeData?.yards || null,
          playerA: scoreA ? {
            gross: scoreA.score,
            extraStrokes: strokesA[h],
            net: scoreA.score - strokesA[h],
            stableford: calcStablefordPoints(scoreA.score, par, strokesA[h], stablefordConfig),
            putts: scoreA.putts,
            fairwayHit: scoreA.fairwayHit,
          } : null,
          playerB: scoreB ? {
            gross: scoreB.score,
            extraStrokes: strokesB[h],
            net: scoreB.score - strokesB[h],
            stableford: calcStablefordPoints(scoreB.score, par, strokesB[h], stablefordConfig),
            putts: scoreB.putts,
            fairwayHit: scoreB.fairwayHit,
          } : null,
        };

        if (scoreA) {
          grossA += scoreA.score;
          netA += entry.playerA.net;
          stablefordA += entry.playerA.stableford;
        }
        if (scoreB) {
          grossB += scoreB.score;
          netB += entry.playerB.net;
          stablefordB += entry.playerB.stableford;
        }

        // Matchplay hole result
        if (scoreA && scoreB) {
          const result = matchplayHoleResult(scoreA.score, scoreB.score, strokesA[h], strokesB[h]);
          entry.matchplayResult = result;
          holeResults.push(result);
        }

        holeComparison.push(entry);
      }

      // Overall matchplay result
      let matchplayResult = null;
      if (holeResults.length > 0) {
        matchplayResult = calcMatchplayResult(holeResults);
      }

      // Detect mismatches — not applicable in per-player scoring (both enter independently)
      // But flag if both submitted and scores need confirmation

      res.json({
        matchId,
        tee: teeData ? { teeName: teeData.teeName, slopeRating, courseRating: Number(courseRating) } : null,
        stablefordConfig,
        handicapAllowancePct: allowancePct,
        playerA: {
          ...match.playerA,
          handicapIndex: handicapA,
          courseHandicap: courseHcpA,
          playingHandicap: playingHcpA,
          totals: { gross: grossA, net: netA, stableford: stablefordA },
          submitted: playerAScores.length > 0,
        },
        playerB: {
          ...match.playerB,
          handicapIndex: handicapB,
          courseHandicap: courseHcpB,
          playingHandicap: playingHcpB,
          totals: { gross: grossB, net: netB, stableford: stablefordB },
          submitted: playerBScores.length > 0,
        },
        holes: holeComparison,
        matchplayResult,
        bothSubmitted: playerAScores.length > 0 && playerBScores.length > 0,
      });
    } catch (err) {
      console.error('Get scores error:', err);
      res.status(500).json({ error: 'Failed to fetch scores' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Accept opponent's scores — auto-confirms the match if both agree
// ──────────────────────────────────────────────────────────────────────────────

router.post('/:matchId/scores/accept',
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
        include: {
          holeScores: true,
          tournament: { include: { tournamentTees: { include: { clubTee: { include: { holes: true } } } } } },
          playerA: true,
          playerB: true,
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      const myScores = match.holeScores.filter(s => s.playerId === player.id);
      const opponentId = match.playerAId === player.id ? match.playerBId : match.playerAId;
      const opponentScores = match.holeScores.filter(s => s.playerId === opponentId);

      if (myScores.length === 0 || opponentScores.length === 0) {
        return res.status(400).json({ error: 'Both players must submit scores before accepting' });
      }

      // Get tee + calculate results
      let teeData = null;
      if (match.tournament.tournamentTees?.length > 0) {
        teeData = match.tournament.tournamentTees[0].clubTee;
      }
      const slopeRating = teeData?.slopeRating || 113;
      const holes = teeData?.holes || [];
      const allowancePct = match.tournament.handicapAllowancePct || 100;
      const stablefordConfig = match.tournament.stablefordConfig || DEFAULT_STABLEFORD;

      const handicapA = match.playerA?.handicapIndex ? Number(match.playerA.handicapIndex) : 0;
      const handicapB = match.playerB?.handicapIndex ? Number(match.playerB.handicapIndex) : 0;
      const playingHcpA = calcPlayingHandicap(calcCourseHandicap(handicapA, slopeRating), allowancePct);
      const playingHcpB = calcPlayingHandicap(calcCourseHandicap(handicapB, slopeRating), allowancePct);
      const strokesA = distributeStrokes(playingHcpA, holes);
      const strokesB = distributeStrokes(playingHcpB, holes);

      // Calculate matchplay result
      const holeResults = [];
      let grossA = 0, grossB = 0;
      for (let h = 1; h <= 18; h++) {
        const sA = myScores.find(s => s.holeNumber === h) || opponentScores.find(s => s.holeNumber === h && s.playerId === match.playerAId);
        const sB = myScores.find(s => s.holeNumber === h && s.playerId === match.playerBId) || opponentScores.find(s => s.holeNumber === h);

        // Use proper player mapping
        const scoreA = match.holeScores.filter(s => s.playerId === match.playerAId).find(s => s.holeNumber === h);
        const scoreB = match.holeScores.filter(s => s.playerId === match.playerBId).find(s => s.holeNumber === h);

        if (scoreA && scoreB) {
          grossA += scoreA.score;
          grossB += scoreB.score;
          holeResults.push(matchplayHoleResult(scoreA.score, scoreB.score, strokesA[h], strokesB[h]));
        }
      }

      const mpResult = calcMatchplayResult(holeResults);
      const winnerId = mpResult.winner === 'A' ? match.playerAId : mpResult.winner === 'B' ? match.playerBId : null;

      // Create/update match result
      await prisma.matchResult.upsert({
        where: { matchId },
        create: {
          matchId,
          resultText: mpResult.text,
          grossScore: winnerId === match.playerAId ? grossA : grossB,
          submittedById: player.id,
          isConfirmed: true,
          confirmedById: player.id,
          confirmedAt: new Date(),
        },
        update: {
          isConfirmed: true,
          confirmedById: player.id,
          confirmedAt: new Date(),
        },
      });

      // Update match status
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          winnerId,
          playedAt: new Date(),
        },
      });

      // Advance winner to next match
      if (match.nextMatchId && winnerId) {
        const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
        if (nextMatch) {
          const slot = !nextMatch.playerAId ? 'playerAId' : 'playerBId';
          await prisma.match.update({
            where: { id: match.nextMatchId },
            data: { [slot]: winnerId },
          });
        }
      }

      res.json({
        message: 'Scores accepted, match completed',
        winnerId,
        resultText: mpResult.text,
      });
    } catch (err) {
      console.error('Accept scores error:', err);
      res.status(500).json({ error: 'Failed to accept scores' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Dispute scores — flag specific holes with reasons
// ──────────────────────────────────────────────────────────────────────────────

router.post('/:matchId/scores/dispute',
  authenticate,
  param('matchId').isUUID(),
  body('reason').trim().notEmpty(),
  body('disputedHoles').optional().isArray(),
  validate,
  async (req, res) => {
    try {
      const { matchId } = req.params;
      const { reason, disputedHoles } = req.body;

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      // Create or update dispute on MatchResult
      await prisma.matchResult.upsert({
        where: { matchId },
        create: {
          matchId,
          resultText: 'DISPUTED',
          submittedById: player.id,
          disputeReason: JSON.stringify({ reason, disputedHoles: disputedHoles || [], disputedBy: player.id }),
        },
        update: {
          disputeReason: JSON.stringify({ reason, disputedHoles: disputedHoles || [], disputedBy: player.id }),
        },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'DISPUTED' },
      });

      res.json({ message: 'Score dispute submitted for admin review' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit dispute' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Admin: resolve dispute
// ──────────────────────────────────────────────────────────────────────────────

router.post('/:matchId/scores/resolve',
  authenticate,
  param('matchId').isUUID(),
  body('winnerId').isUUID(),
  body('resultText').trim().notEmpty(),
  body('resolution').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      // Verify admin
      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { matchId } = req.params;
      const { winnerId, resultText, resolution } = req.body;

      await prisma.matchResult.upsert({
        where: { matchId },
        create: {
          matchId,
          resultText,
          submittedById: req.user.id,
          isConfirmed: true,
          confirmedAt: new Date(),
          disputeReason: `RESOLVED: ${resolution}`,
        },
        update: {
          resultText,
          isConfirmed: true,
          confirmedAt: new Date(),
          disputeReason: `RESOLVED: ${resolution}`,
        },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'COMPLETED', winnerId, playedAt: new Date() },
      });

      // Advance winner
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (match.nextMatchId && winnerId) {
        const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
        if (nextMatch) {
          const slot = !nextMatch.playerAId ? 'playerAId' : 'playerBId';
          await prisma.match.update({ where: { id: match.nextMatchId }, data: { [slot]: winnerId } });
        }
      }

      res.json({ message: 'Dispute resolved, match completed' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to resolve dispute' });
    }
  }
);

// Helper: compare scores between two players
async function compareScores(match, playerIdA, playerIdB) {
  const allScores = await prisma.matchHoleScore.findMany({
    where: { matchId: match.id },
    orderBy: { holeNumber: 'asc' },
  });

  const scoresA = allScores.filter(s => s.playerId === playerIdA);
  const scoresB = allScores.filter(s => s.playerId === playerIdB);

  const mismatches = [];
  for (let h = 1; h <= 18; h++) {
    const a = scoresA.find(s => s.holeNumber === h);
    const b = scoresB.find(s => s.holeNumber === h);
    if (a && b && a.score !== b.score) {
      mismatches.push({ holeNumber: h, playerAScore: a.score, playerBScore: b.score });
    }
  }

  return { mismatches, scoresMatch: mismatches.length === 0 };
}

module.exports = router;

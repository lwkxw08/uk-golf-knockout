const express = require('express');
const { randomBytes } = require('crypto');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const config = require('../config');

const router = express.Router();

function buildState(match) {
  const scoresByHole = {};
  for (const hs of match.holeScores) {
    if (!scoresByHole[hs.holeNumber]) scoresByHole[hs.holeNumber] = {};
    scoresByHole[hs.holeNumber][hs.playerId] = { score: hs.score };
  }

  let playerAUp = 0;
  let holesPlayed = 0;
  for (let h = 1; h <= 18; h += 1) {
    const hole = scoresByHole[h];
    if (!hole || !hole[match.playerAId] || !hole[match.playerBId]) continue;
    holesPlayed += 1;
    if (hole[match.playerAId].score < hole[match.playerBId].score) playerAUp += 1;
    else if (hole[match.playerBId].score < hole[match.playerAId].score) playerAUp -= 1;
  }

  const holesRemaining = 18 - holesPlayed;
  const leaderName = playerAUp > 0 ? match.playerA?.firstName : match.playerB?.firstName;
  const margin = Math.abs(playerAUp);

  let summary = 'All square';
  if (margin > 0) summary = `${leaderName} ${margin} up`;
  if (margin > holesRemaining && holesPlayed > 0) summary = `${leaderName} won ${margin}&${holesRemaining}`;

  return { scoresByHole, holesPlayed, holesRemaining, playerAUp, summary };
}

// Share link for a match — participants only, token created on first request
router.post('/match/:matchId/share-link',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      if (!player) return res.status(404).json({ error: 'Player profile not found' });

      const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.playerAId !== player.id && match.playerBId !== player.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only participants can share this match' });
      }

      let { shareToken } = match;
      if (!shareToken) {
        shareToken = randomBytes(9).toString('base64url');
        await prisma.match.update({ where: { id: match.id }, data: { shareToken } });
      }

      res.json({ shareToken, url: `${config.clientUrl}/watch/${shareToken}` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create share link' });
    }
  }
);

// Public spectator view — no auth, token only
router.get('/:shareToken', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { shareToken: req.params.shareToken },
      include: {
        playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true, avatarUrl: true, homeClub: { select: { name: true } } } },
        playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true, avatarUrl: true, homeClub: { select: { name: true } } } },
        tournament: { select: { id: true, name: true, formatType: true } },
        venueClub: { select: { id: true, name: true, city: true, county: true } },
        holeScores: { orderBy: { holeNumber: 'asc' } },
        result: { select: { resultText: true, isConfirmed: true } },
      },
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    await prisma.match.update({
      where: { id: match.id },
      data: { spectatorViews: { increment: 1 } },
    });

    res.json({
      match: {
        id: match.id,
        status: match.status,
        stage: match.stage,
        gameWeek: match.gameWeek,
        currentHole: match.currentHole,
        scheduledDate: match.scheduledDate,
        matchStartedAt: match.matchStartedAt,
        matchEndedAt: match.matchEndedAt,
        winnerId: match.winnerId,
        resultText: match.result?.resultText || null,
      },
      playerA: match.playerA,
      playerB: match.playerB,
      tournament: match.tournament,
      venue: match.venueClub,
      spectatorViews: match.spectatorViews + 1,
      ...buildState(match),
    });
  } catch (err) {
    console.error('Spectate error:', err);
    res.status(500).json({ error: 'Failed to load match' });
  }
});

module.exports = router;

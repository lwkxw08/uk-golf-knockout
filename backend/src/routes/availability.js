const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { notify } = require('../services/notificationService');

const router = express.Router();

const SLOTS = ['MORNING', 'AFTERNOON', 'EVENING'];
const SLOT_LABELS = { MORNING: 'morning', AFTERNOON: 'afternoon', EVENING: 'evening' };
const SLOT_HOURS = { MORNING: 8, AFTERNOON: 13, EVENING: 17 };

function dateOnly(value) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function currentPlayer(req, res) {
  const player = await prisma.player.findUnique({
    where: { userId: req.user.id },
    select: { id: true, firstName: true, lastName: true, homeClubId: true },
  });
  if (!player) {
    res.status(404).json({ error: 'Player profile not found' });
    return null;
  }
  return player;
}

// ─── MY AVAILABILITY ─────────────────────────────────────────────────────

router.get('/me',
  authenticate,
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  validate,
  async (req, res) => {
    try {
      const player = await currentPlayer(req, res);
      if (!player) return;

      const from = req.query.from ? dateOnly(req.query.from) : dateOnly(new Date());
      const to = req.query.to ? dateOnly(req.query.to) : new Date(from.getTime() + 84 * 24 * 60 * 60 * 1000);

      const slots = await prisma.playerAvailability.findMany({
        where: { playerId: player.id, date: { gte: from, lte: to } },
        orderBy: [{ date: 'asc' }, { slot: 'asc' }],
      });

      res.json({ availability: slots.map((s) => ({ ...s, date: isoDate(s.date) })) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load availability' });
    }
  }
);

// Replace availability for a set of dates in one call (the calendar UI saves a whole month)
router.put('/me',
  authenticate,
  body('dates').isArray({ min: 1 }),
  body('dates.*.date').isISO8601(),
  body('dates.*.slots').isArray(),
  validate,
  async (req, res) => {
    try {
      const player = await currentPlayer(req, res);
      if (!player) return;

      const entries = req.body.dates.map(({ date, slots }) => ({
        date: dateOnly(date),
        slots: slots.filter((s) => SLOTS.includes(s)),
      }));

      await prisma.$transaction([
        prisma.playerAvailability.deleteMany({
          where: { playerId: player.id, date: { in: entries.map((e) => e.date) } },
        }),
        prisma.playerAvailability.createMany({
          data: entries.flatMap((e) => e.slots.map((slot) => ({ playerId: player.id, date: e.date, slot }))),
          skipDuplicates: true,
        }),
      ]);

      const saved = await prisma.playerAvailability.findMany({
        where: { playerId: player.id, date: { in: entries.map((e) => e.date) } },
        orderBy: [{ date: 'asc' }, { slot: 'asc' }],
      });

      res.json({ availability: saved.map((s) => ({ ...s, date: isoDate(s.date) })) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save availability' });
    }
  }
);

// ─── SUGGESTIONS FOR A FIXTURE ───────────────────────────────────────────

// Overlapping slots between both players, up to the round deadline
router.get('/match/:matchId/suggestions',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const player = await currentPlayer(req, res);
      if (!player) return;

      const match = await prisma.match.findUnique({
        where: { id: req.params.matchId },
        include: {
          playerA: { select: { id: true, firstName: true, lastName: true, homeClubId: true } },
          playerB: { select: { id: true, firstName: true, lastName: true, homeClubId: true } },
          venueClub: { select: { id: true, name: true } },
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only participants can view suggestions' });
      }
      if (!match.playerAId || !match.playerBId) {
        return res.json({ suggestions: [], reason: 'Opponent not yet decided' });
      }

      const from = dateOnly(new Date());
      const to = match.roundDeadline ? dateOnly(match.roundDeadline) : new Date(from.getTime() + 56 * 24 * 60 * 60 * 1000);

      const slots = await prisma.playerAvailability.findMany({
        where: {
          playerId: { in: [match.playerAId, match.playerBId] },
          date: { gte: from, lte: to },
        },
        orderBy: [{ date: 'asc' }, { slot: 'asc' }],
      });

      // Group by date+slot; a suggestion is where both players appear
      const buckets = new Map();
      for (const s of slots) {
        const key = `${isoDate(s.date)}|${s.slot}`;
        if (!buckets.has(key)) buckets.set(key, new Set());
        buckets.get(key).add(s.playerId);
      }

      const suggestions = [...buckets.entries()]
        .filter(([, players]) => players.size === 2)
        .map(([key]) => {
          const [date, slot] = key.split('|');
          return { date, slot, label: `${new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${SLOT_LABELS[slot]}` };
        })
        .slice(0, 20);

      const mine = new Set(slots.filter((s) => s.playerId === player.id).map((s) => `${isoDate(s.date)}|${s.slot}`));
      const theirs = new Set(slots.filter((s) => s.playerId !== player.id).map((s) => `${isoDate(s.date)}|${s.slot}`));

      res.json({
        suggestions,
        myslotCount: mine.size,
        opponentSlotCount: theirs.size,
        deadline: match.roundDeadline,
        venue: match.venueClub,
        opponent: match.playerAId === player.id ? match.playerB : match.playerA,
      });
    } catch (err) {
      console.error('Suggestions error:', err);
      res.status(500).json({ error: 'Failed to build suggestions' });
    }
  }
);

// ─── PROPOSALS ───────────────────────────────────────────────────────────

router.get('/match/:matchId/proposals',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const player = await currentPlayer(req, res);
      if (!player) return;

      const proposals = await prisma.matchScheduleProposal.findMany({
        where: { matchId: req.params.matchId },
        include: { proposedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({
        proposals: proposals.map((p) => ({
          ...p,
          date: isoDate(p.date),
          mine: p.proposedById === player.id,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load proposals' });
    }
  }
);

router.post('/match/:matchId/propose',
  authenticate,
  param('matchId').isUUID(),
  body('date').isISO8601(),
  body('slot').isIn(SLOTS),
  body('venueClubId').optional().isUUID(),
  body('message').optional().isString().isLength({ max: 300 }),
  validate,
  async (req, res) => {
    try {
      const player = await currentPlayer(req, res);
      if (!player) return;

      const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only participants can propose a time' });
      }
      if (['COMPLETED', 'WALKOVER'].includes(match.status)) {
        return res.status(400).json({ error: 'Match is already finished' });
      }

      const { date, slot, venueClubId, message } = req.body;

      // Only one live proposal per player at a time
      await prisma.matchScheduleProposal.updateMany({
        where: { matchId: match.id, proposedById: player.id, status: 'PENDING' },
        data: { status: 'WITHDRAWN', respondedAt: new Date() },
      });

      const proposal = await prisma.matchScheduleProposal.create({
        data: {
          matchId: match.id,
          proposedById: player.id,
          date: dateOnly(date),
          slot,
          venueClubId: venueClubId || match.venueClubId,
          message: message || null,
        },
      });

      const opponentId = match.playerAId === player.id ? match.playerBId : match.playerAId;
      await notify(opponentId, {
        type: 'MATCH_PROPOSAL',
        title: 'New match time proposed',
        body: `${player.firstName} ${player.lastName} proposed ${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} (${SLOT_LABELS[slot]}). Accept or suggest another time.`,
        link: `/matches/${match.id}`,
        data: { matchId: match.id, proposalId: proposal.id },
      });

      res.status(201).json(proposal);
    } catch (err) {
      console.error('Propose error:', err);
      res.status(500).json({ error: 'Failed to create proposal' });
    }
  }
);

router.post('/proposals/:proposalId/respond',
  authenticate,
  param('proposalId').isUUID(),
  body('accept').isBoolean(),
  validate,
  async (req, res) => {
    try {
      const player = await currentPlayer(req, res);
      if (!player) return;

      const proposal = await prisma.matchScheduleProposal.findUnique({
        where: { id: req.params.proposalId },
        include: { match: true, proposedBy: { select: { id: true, firstName: true, lastName: true } } },
      });
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
      if (proposal.status !== 'PENDING') return res.status(400).json({ error: 'Proposal already resolved' });

      const { match } = proposal;
      if (match.playerAId !== player.id && match.playerBId !== player.id) {
        return res.status(403).json({ error: 'Only participants can respond' });
      }
      if (proposal.proposedById === player.id) {
        return res.status(400).json({ error: 'Cannot respond to your own proposal' });
      }

      if (!req.body.accept) {
        await prisma.matchScheduleProposal.update({
          where: { id: proposal.id },
          data: { status: 'DECLINED', respondedAt: new Date() },
        });

        await notify(proposal.proposedById, {
          type: 'MATCH_PROPOSAL',
          title: 'Proposed time declined',
          body: `${player.firstName} ${player.lastName} can't make that time. Try another slot from your shared availability.`,
          link: `/matches/${match.id}`,
          data: { matchId: match.id },
        });

        return res.json({ status: 'DECLINED' });
      }

      // Accepted — lock the fixture in
      const scheduledDate = new Date(proposal.date);
      scheduledDate.setUTCHours(SLOT_HOURS[proposal.slot], 0, 0, 0);

      const [, updatedMatch] = await prisma.$transaction([
        prisma.matchScheduleProposal.update({
          where: { id: proposal.id },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        }),
        prisma.match.update({
          where: { id: match.id },
          data: {
            scheduledDate,
            scheduledSlot: proposal.slot,
            status: 'SCHEDULED',
            ...(proposal.venueClubId ? { venueClubId: proposal.venueClubId } : {}),
          },
          include: { venueClub: { select: { id: true, name: true } } },
        }),
        prisma.matchScheduleProposal.updateMany({
          where: { matchId: match.id, status: 'PENDING', id: { not: proposal.id } },
          data: { status: 'WITHDRAWN', respondedAt: new Date() },
        }),
      ]);

      const when = scheduledDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      const venueSuffix = updatedMatch.venueClub ? ` at ${updatedMatch.venueClub.name}` : '';

      await notify(proposal.proposedById, {
        type: 'MATCH_SCHEDULED',
        title: 'Match confirmed',
        body: `${player.firstName} ${player.lastName} accepted ${when} (${SLOT_LABELS[proposal.slot]})${venueSuffix}.`,
        link: `/matches/${match.id}`,
        data: { matchId: match.id },
      });

      await notify(player.id, {
        type: 'MATCH_SCHEDULED',
        title: 'Match confirmed',
        body: `Your match is set for ${when} (${SLOT_LABELS[proposal.slot]})${venueSuffix}.`,
        link: `/matches/${match.id}`,
        data: { matchId: match.id },
      });

      res.json({ status: 'ACCEPTED', match: updatedMatch });
    } catch (err) {
      console.error('Respond to proposal error:', err);
      res.status(500).json({ error: 'Failed to respond to proposal' });
    }
  }
);

module.exports = router;

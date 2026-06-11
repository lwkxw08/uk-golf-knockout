const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get sponsor ads for a placement (public, rotates ads)
router.get('/placement/:placement', optionalAuth, async (req, res) => {
  try {
    const { placement } = req.params;
    const { tournamentId, clubId, matchId, limit = 3 } = req.query;

    const where = { isActive: true };
    if (tournamentId) where.tournamentId = tournamentId;
    else if (clubId) where.clubId = clubId;

    // Get active sponsors for this context, ordered randomly
    const sponsors = await prisma.sponsor.findMany({
      where,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        website: true,
        tier: true,
        adImageUrl: true,
        adText: true,
      },
      take: Number(limit),
    });

    // Shuffle for rotation
    for (let i = sponsors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sponsors[i], sponsors[j]] = [sponsors[j], sponsors[i]];
    }

    // Record impressions
    if (sponsors.length > 0) {
      const impressionData = sponsors.map((s) => ({
        sponsorId: s.id,
        placement,
        matchId: matchId || null,
        tournamentId: tournamentId || null,
        viewerId: req.user?.playerId || null,
      }));
      prisma.sponsorAdImpression.createMany({ data: impressionData }).catch(() => {});
    }

    res.json({ ads: sponsors, placement });
  } catch (err) {
    console.error('Sponsor ads error:', err);
    res.status(500).json({ error: 'Failed to fetch sponsor ads' });
  }
});

// Get sponsor ad stats (admin)
router.get('/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

    const { sponsorId, from, to } = req.query;
    const where = {};
    if (sponsorId) where.sponsorId = sponsorId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, byPlacement, bySponsor] = await Promise.all([
      prisma.sponsorAdImpression.count({ where }),
      prisma.sponsorAdImpression.groupBy({
        by: ['placement'],
        where,
        _count: true,
      }),
      prisma.sponsorAdImpression.groupBy({
        by: ['sponsorId'],
        where,
        _count: true,
        orderBy: { _count: { sponsorId: 'desc' } },
        take: 20,
      }),
    ]);

    // Enrich bySponsor with names
    const sponsorIds = bySponsor.map((s) => s.sponsorId);
    const sponsors = await prisma.sponsor.findMany({
      where: { id: { in: sponsorIds } },
      select: { id: true, name: true, tier: true },
    });
    const sponsorMap = Object.fromEntries(sponsors.map((s) => [s.id, s]));

    res.json({
      total,
      byPlacement: byPlacement.map((p) => ({ placement: p.placement, count: p._count })),
      bySponsor: bySponsor.map((s) => ({
        ...sponsorMap[s.sponsorId],
        impressions: s._count,
      })),
    });
  } catch (err) {
    console.error('Sponsor stats error:', err);
    res.status(500).json({ error: 'Failed to fetch sponsor stats' });
  }
});

// Record a click (public)
router.post('/click/:sponsorId', optionalAuth, async (req, res) => {
  try {
    const { placement, matchId, tournamentId } = req.body;
    await prisma.sponsorAdImpression.create({
      data: {
        sponsorId: req.params.sponsorId,
        placement: `${placement || 'unknown'}_click`,
        matchId: matchId || null,
        tournamentId: tournamentId || null,
        viewerId: req.user?.playerId || null,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record click' });
  }
});

module.exports = router;

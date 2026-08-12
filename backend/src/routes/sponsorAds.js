const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Tier-based placement rules:
// NATIONAL  — shows everywhere (bracket, feed, match_page, scorecard, leaderboard)
// REGIONAL  — shows on tournament pages and matches within their region
// LOCAL     — shows on club-specific pages and their club's matches
// CLUB      — shows only on their specific club's match pages and club portal
const TIER_PLACEMENTS = {
  NATIONAL: ['bracket', 'feed', 'match_page', 'scorecard', 'leaderboard'],
  REGIONAL: ['bracket', 'match_page', 'scorecard', 'leaderboard'],
  LOCAL: ['match_page', 'scorecard', 'leaderboard'],
  CLUB: ['match_page', 'scorecard'],
};

// Get sponsor ads for a placement (public, rotates ads)
router.get('/placement/:placement', optionalAuth, async (req, res) => {
  try {
    const { placement } = req.params;
    const { tournamentId, clubId, matchId, regionId, limit = 3 } = req.query;

    // Build tier filter: only tiers allowed for this placement
    const allowedTiers = Object.entries(TIER_PLACEMENTS)
      .filter(([, placements]) => placements.includes(placement))
      .map(([tier]) => tier);

    // Build OR conditions based on tier scoping rules
    const tierConditions = [];

    // NATIONAL sponsors — always eligible (no scoping needed)
    if (allowedTiers.includes('NATIONAL')) {
      tierConditions.push({ tier: 'NATIONAL', isActive: true });
    }

    // REGIONAL sponsors — must match region (via tournament or explicit regionId)
    if (allowedTiers.includes('REGIONAL')) {
      if (regionId) {
        tierConditions.push({ tier: 'REGIONAL', isActive: true, regionId });
      } else if (tournamentId) {
        // Look up tournament's region and include regional sponsors for it
        tierConditions.push({ tier: 'REGIONAL', isActive: true, tournamentId });
        tierConditions.push({ tier: 'REGIONAL', isActive: true, tournament: { id: tournamentId } });
      }
    }

    // LOCAL sponsors — must match club
    if (allowedTiers.includes('LOCAL')) {
      if (clubId) {
        tierConditions.push({ tier: 'LOCAL', isActive: true, clubId });
      }
    }

    // CLUB sponsors — must match specific club
    if (allowedTiers.includes('CLUB')) {
      if (clubId) {
        tierConditions.push({ tier: 'CLUB', isActive: true, clubId });
      }
    }

    if (tierConditions.length === 0) {
      return res.json({ ads: [], placement });
    }

    // Get active sponsors matching tier rules
    const sponsors = await prisma.sponsor.findMany({
      where: { OR: tierConditions },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        website: true,
        tier: true,
        adImageUrl: true,
        adText: true,
      },
      take: Number(limit) * 3, // fetch extra for shuffling
    });

    // Shuffle for rotation
    for (let i = sponsors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sponsors[i], sponsors[j]] = [sponsors[j], sponsors[i]];
    }

    // Prioritise by tier: NATIONAL first, then REGIONAL, LOCAL, CLUB
    const tierOrder = { NATIONAL: 0, REGIONAL: 1, LOCAL: 2, CLUB: 3 };
    sponsors.sort((a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9));

    // Trim to requested limit
    const result = sponsors.slice(0, Number(limit));

    // Record impressions
    if (result.length > 0) {
      const impressionData = result.map((s) => ({
        sponsorId: s.id,
        placement,
        matchId: matchId || null,
        tournamentId: tournamentId || null,
        viewerId: req.user?.playerId || null,
      }));
      prisma.sponsorAdImpression.createMany({ data: impressionData }).catch(() => {});
    }

    res.json({ ads: result, placement });
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

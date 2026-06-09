const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole, requireClubAccess } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Club manager: get own managed club (must be before /:slug routes)
router.get('/my/managed',
  authenticate,
  async (req, res) => {
    try {
      const mgr = await prisma.clubManager.findUnique({
        where: { userId: req.user.id },
        include: { club: { include: { region: true } } },
      });
      if (!mgr) return res.status(404).json({ error: 'No managed club found' });
      res.json(mgr);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch managed club' });
    }
  }
);

// Public: list clubs
router.get('/', async (req, res) => {
  try {
    const { region, search, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (region) where.region = { slug: region };
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where,
        include: { region: true, _count: { select: { players: true } } },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.club.count({ where }),
    ]);

    res.json({ clubs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

// Public: get club tees + scorecard (hole-by-hole) — must be before /:slug
router.get('/:slug/scorecard', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, name: true, slug: true, courseApiId: true,
        tees: {
          include: { holes: { orderBy: { holeNumber: 'asc' } } },
          orderBy: { teeName: 'asc' },
        },
      },
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    res.json(club);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scorecard' });
  }
});

// Public: get club by slug with full details
router.get('/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      include: {
        region: true,
        sponsors: { where: { isActive: true } },
        players: {
          select: { id: true, firstName: true, lastName: true, handicapIndex: true, rankingPoints: true },
          orderBy: { rankingPoints: 'desc' },
          take: 20,
        },
        _count: { select: { players: true, matches: true } },
      },
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    // Fixtures: upcoming matches at this club
    const fixtures = await prisma.match.findMany({
      where: {
        venueClubId: club.id,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: {
        tournament: { select: { name: true } },
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    });

    // Recent results at this club
    const results = await prisma.match.findMany({
      where: {
        venueClubId: club.id,
        status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] },
      },
      include: {
        tournament: { select: { name: true } },
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
        winner: { select: { firstName: true, lastName: true } },
        result: { select: { resultText: true } },
      },
      orderBy: { playedAt: 'desc' },
      take: 10,
    });

    // Rankings: players from this club
    const rankings = await prisma.player.findMany({
      where: { homeClubId: club.id, rankingPoints: { gt: 0 } },
      select: { id: true, firstName: true, lastName: true, handicapIndex: true, rankingPoints: true },
      orderBy: { rankingPoints: 'desc' },
    });

    // Course offerings
    const offerings = await prisma.courseOffering.findMany({
      where: { clubId: club.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ...club, fixtures, results, rankings, offerings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch club' });
  }
});

// Club manager: get own club dashboard data
router.get('/:clubId/dashboard',
  authenticate,
  param('clubId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { clubId } = req.params;

      // Verify access
      if (req.user.role !== 'ADMIN') {
        const mgr = await prisma.clubManager.findFirst({
          where: { userId: req.user.id, clubId },
        });
        if (!mgr) return res.status(403).json({ error: 'Access denied' });
      }

      const [club, membersList, entries, matchesTotal, upcomingFixtures, recentResults, revenue, sponsors, tees, leagueStandings, clubChampionship] = await Promise.all([
        prisma.club.findUnique({ where: { id: clubId }, include: { region: true } }),
        prisma.player.findMany({
          where: { homeClubId: clubId },
          select: { id: true, firstName: true, lastName: true, handicapIndex: true, rankingPoints: true, user: { select: { email: true } }, createdAt: true },
          orderBy: { lastName: 'asc' },
        }),
        prisma.tournamentEntry.count({ where: { clubId } }),
        prisma.match.count({ where: { venueClubId: clubId } }),
        prisma.match.findMany({
          where: { venueClubId: clubId, status: { in: ['PENDING', 'SCHEDULED'] } },
          include: {
            tournament: { select: { name: true } },
            playerA: { select: { firstName: true, lastName: true, handicapIndex: true } },
            playerB: { select: { firstName: true, lastName: true, handicapIndex: true } },
          },
          orderBy: { scheduledDate: 'asc' },
          take: 20,
        }),
        prisma.match.findMany({
          where: { venueClubId: clubId, status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] } },
          include: {
            tournament: { select: { name: true } },
            playerA: { select: { firstName: true, lastName: true } },
            playerB: { select: { firstName: true, lastName: true } },
            winner: { select: { firstName: true, lastName: true } },
            result: { select: { resultText: true } },
          },
          orderBy: { playedAt: 'desc' },
          take: 20,
        }),
        prisma.revenueTransaction.aggregate({
          _sum: { clubAmountPence: true },
          where: { clubId, status: 'COMPLETED' },
        }),
        prisma.sponsor.findMany({ where: { clubId, isActive: true } }),
        prisma.clubTee.findMany({
          where: { clubId },
          include: { holes: { orderBy: { holeNumber: 'asc' } } },
          orderBy: { teeName: 'asc' },
        }),
        // League standings for this club's players
        prisma.leagueStanding.findMany({
          where: { clubId },
          include: {
            player: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
            tournament: { select: { id: true, name: true, season: true } },
          },
          orderBy: { position: 'asc' },
        }),
        // Club championship standings
        prisma.clubSeasonPoints.findMany({
          where: { clubId },
          include: {
            club: { select: { id: true, name: true, slug: true } },
            region: { select: { id: true, name: true } },
          },
          orderBy: { season: 'desc' },
        }),
      ]);

      // Also fetch all clubs in same region for championship comparison
      const regionId = club?.regionId;
      let regionChampionship = [];
      if (regionId && clubChampionship.length > 0) {
        regionChampionship = await prisma.clubSeasonPoints.findMany({
          where: { season: clubChampionship[0].season, regionId },
          include: {
            club: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { position: 'asc' },
        });
      }

      res.json({
        club,
        stats: {
          members: membersList.length,
          entries,
          matches: matchesTotal,
          revenue: revenue._sum.clubAmountPence || 0,
        },
        members: membersList,
        fixtures: upcomingFixtures,
        results: recentResults,
        sponsors,
        tees,
        leagueStandings,
        clubChampionship,
        regionChampionship,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch club dashboard' });
    }
  }
);

// Club manager: update club settings
router.put('/:clubId/settings',
  authenticate,
  param('clubId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      if (req.user.role !== 'ADMIN') {
        const mgr = await prisma.clubManager.findFirst({ where: { userId: req.user.id, clubId } });
        if (!mgr) return res.status(403).json({ error: 'Access denied' });
      }

      const { name, description, phone, email, website, address, city, county, postcode } = req.body;
      const club = await prisma.club.update({
        where: { id: clubId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(website !== undefined && { website }),
          ...(address !== undefined && { address }),
          ...(city !== undefined && { city }),
          ...(county !== undefined && { county }),
          ...(postcode !== undefined && { postcode }),
        },
        include: { region: true },
      });
      res.json(club);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update club settings' });
    }
  }
);

// Helper: upsert tees and holes for a club
async function saveTees(clubId, tees) {
  if (!tees || !Array.isArray(tees)) return;
  for (const tee of tees) {
    const teeRecord = await prisma.clubTee.upsert({
      where: { clubId_teeName: { clubId, teeName: tee.teeName } },
      create: {
        clubId,
        teeApiId: tee.teeId || null,
        teeName: tee.teeName,
        gender: tee.gender || 'Male',
        slopeRating: tee.slopeRating || null,
        courseRating: tee.courseRating || null,
        bogeyRating: tee.bogeyRating || null,
        par: tee.par || null,
        totalYards: tee.totalYards || null,
        totalMeters: tee.totalMeters || null,
        numberOfHoles: tee.numberOfHoles || 18,
      },
      update: {
        teeApiId: tee.teeId || undefined,
        gender: tee.gender || undefined,
        slopeRating: tee.slopeRating || undefined,
        courseRating: tee.courseRating || undefined,
        bogeyRating: tee.bogeyRating || undefined,
        par: tee.par || undefined,
        totalYards: tee.totalYards || undefined,
        totalMeters: tee.totalMeters || undefined,
        numberOfHoles: tee.numberOfHoles || undefined,
      },
    });

    // Save holes if provided
    if (tee.holes && Array.isArray(tee.holes)) {
      for (const hole of tee.holes) {
        await prisma.clubTeeHole.upsert({
          where: { clubTeeId_holeNumber: { clubTeeId: teeRecord.id, holeNumber: hole.holeNumber } },
          create: {
            clubTeeId: teeRecord.id,
            holeNumber: hole.holeNumber,
            par: hole.par,
            yards: hole.yards || null,
            meters: hole.meters || null,
            strokeIndex: hole.strokeIndex || null,
          },
          update: {
            par: hole.par,
            yards: hole.yards || undefined,
            meters: hole.meters || undefined,
            strokeIndex: hole.strokeIndex || undefined,
          },
        });
      }
    }
  }
}

// Admin: create club
router.post('/',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  validate,
  async (req, res) => {
    try {
      const { tees, ...clubData } = req.body;
      const club = await prisma.club.create({ data: clubData });
      await saveTees(club.id, tees);
      const full = await prisma.club.findUnique({
        where: { id: club.id },
        include: { tees: { include: { holes: { orderBy: { holeNumber: 'asc' } } }, orderBy: { teeName: 'asc' } } },
      });
      res.status(201).json(full);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
      console.error('Club create error:', err);
      res.status(500).json({ error: 'Failed to create club' });
    }
  }
);

// Admin/Manager: update club
router.put('/:clubId',
  authenticate,
  requireClubAccess,
  param('clubId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { tees, ...clubData } = req.body;
      const club = await prisma.club.update({ where: { id: clubId }, data: clubData });
      if (tees) await saveTees(clubId, tees);
      const full = await prisma.club.findUnique({
        where: { id: clubId },
        include: { tees: { include: { holes: { orderBy: { holeNumber: 'asc' } } }, orderBy: { teeName: 'asc' } } },
      });
      res.json(full);
    } catch (err) {
      console.error('Club update error:', err);
      res.status(500).json({ error: 'Failed to update club' });
    }
  }
);

module.exports = router;

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// ─── PLATFORM PRICING ───────────────────────────────────────────────────────

router.get('/pricing', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const pricing = await prisma.platformPricing.findMany({
      orderBy: { pricingKey: 'asc' },
    });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

router.put('/pricing/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  body('amountPence').optional().isInt({ min: 0 }),
  validate,
  async (req, res) => {
    try {
      const { amountPence, description, effectiveFrom, effectiveTo } = req.body;
      const data = {};
      if (amountPence !== undefined) data.amountPence = amountPence;
      if (description !== undefined) data.description = description;
      if (effectiveFrom) data.effectiveFrom = new Date(effectiveFrom);
      if (effectiveTo !== undefined) data.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
      const pricing = await prisma.platformPricing.update({
        where: { id: req.params.id },
        data,
      });
      res.json(pricing);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  }
);

router.post('/pricing',
  authenticate,
  requireRole('ADMIN'),
  body('pricingKey').trim().notEmpty(),
  body('amountPence').isInt({ min: 0 }),
  body('effectiveFrom').isISO8601(),
  validate,
  async (req, res) => {
    try {
      const pricing = await prisma.platformPricing.create({
        data: {
          ...req.body,
          effectiveFrom: new Date(req.body.effectiveFrom),
          effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : null,
        },
      });
      res.status(201).json(pricing);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Pricing key already exists' });
      res.status(500).json({ error: 'Failed to create pricing' });
    }
  }
);

router.delete('/pricing/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      await prisma.platformPricing.delete({ where: { id: req.params.id } });
      res.json({ message: 'Pricing deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete pricing' });
    }
  }
);

// ─── REGIONS ────────────────────────────────────────────────────────────────

router.get('/regions', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      include: { _count: { select: { clubs: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(regions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

router.post('/regions',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  validate,
  async (req, res) => {
    try {
      const region = await prisma.region.create({ data: req.body });
      res.status(201).json(region);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Region already exists' });
      res.status(500).json({ error: 'Failed to create region' });
    }
  }
);

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────

router.get('/stats', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [
      clubs, players, tournaments, activeMatches, completedMatches, totalMatches,
      revenue, memberships, clubSubs, entries, disputes,
      recentPlayers, recentMatches, tournamentsByStatus, regions,
    ] = await Promise.all([
      prisma.club.count({ where: { isActive: true } }),
      prisma.player.count(),
      prisma.tournament.count(),
      prisma.match.count({ where: { status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] } } }),
      prisma.match.count({ where: { status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] } } }),
      prisma.match.count(),
      prisma.revenueTransaction.aggregate({
        _sum: { totalAmountPence: true, platformAmountPence: true, clubAmountPence: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.playerMembership.count({ where: { status: 'ACTIVE' } }),
      prisma.clubSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.tournamentEntry.count(),
      prisma.match.count({ where: { status: 'DISPUTED' } }),
      prisma.player.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, createdAt: true, homeClub: { select: { name: true } } } }),
      prisma.match.findMany({ take: 8, orderBy: { updatedAt: 'desc' }, where: { status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] } }, select: { id: true, matchNumber: true, status: true, updatedAt: true, gameWeek: true, tournament: { select: { name: true } }, playerA: { select: { firstName: true, lastName: true } }, playerB: { select: { firstName: true, lastName: true } }, result: { select: { resultText: true } } } }),
      prisma.tournament.groupBy({ by: ['status'], _count: true }),
      prisma.club.groupBy({ by: ['county'], _count: true }),
    ]);

    res.json({
      clubs,
      players,
      tournaments,
      activeMatches,
      completedMatches,
      totalMatches,
      totalEntries: entries,
      disputes,
      activeMemberships: memberships,
      activeClubSubscriptions: clubSubs,
      revenue: {
        total: revenue._sum.totalAmountPence || 0,
        platform: revenue._sum.platformAmountPence || 0,
        clubs: revenue._sum.clubAmountPence || 0,
      },
      recentPlayers,
      recentMatches,
      tournamentsByStatus: tournamentsByStatus.reduce((acc, t) => { acc[t.status] = t._count; return acc; }, {}),
      regionBreakdown: regions.sort((a, b) => b._count - a._count),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── USER MANAGEMENT ────────────────────────────────────────────────────────

router.get('/users', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { player: { firstName: { contains: search, mode: 'insensitive' } } },
        { player: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, role: true, isActive: true, createdAt: true,
          player: { select: { firstName: true, lastName: true, homeClub: { select: { name: true } } } },
        },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  body('role').isIn(['ADMIN', 'CLUB_MANAGER', 'PLAYER']),
  validate,
  async (req, res) => {
    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { role: req.body.role },
        select: { id: true, email: true, role: true },
      });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// ─── SPONSORS (full CRUD) ───────────────────────────────────────────────────

router.get('/sponsors', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      include: { region: true, club: true, tournament: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sponsors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

router.post('/sponsors',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('tier').isIn(['NATIONAL', 'REGIONAL', 'LOCAL', 'CLUB']),
  validate,
  async (req, res) => {
    try {
      const sponsor = await prisma.sponsor.create({ data: req.body });
      res.status(201).json(sponsor);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create sponsor' });
    }
  }
);

router.put('/sponsors/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const sponsor = await prisma.sponsor.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(sponsor);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update sponsor' });
    }
  }
);

router.delete('/sponsors/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      await prisma.sponsor.delete({ where: { id: req.params.id } });
      res.json({ message: 'Sponsor deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete sponsor' });
    }
  }
);

// ─── STAGE PROGRESSION ──────────────────────────────────────────────────────

const RANKING_POINTS = {
  NATIONAL_FINAL: { winner: 100, finalist: 50, semifinalist: 25, quarterfinalist: 15 },
  REGIONAL: { winner: 40, finalist: 20, semifinalist: 10, quarterfinalist: 5 },
  CLUB_QUALIFIER: { winner: 15, finalist: 8, semifinalist: 4, quarterfinalist: 2 },
};

// Progress a stage — uses feedsIntoStageId to find the next stage
// Accepts either stage UUID or legacy stage type name (CLUB_QUALIFIER, REGIONAL)
router.post('/tournaments/:tournamentId/progress/:stageIdOrType',
  authenticate,
  requireRole('ADMIN'),
  param('tournamentId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { tournamentId, stageIdOrType } = req.params;

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          stages: { orderBy: { stageOrder: 'asc' } },
        },
      });
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

      // Find current stage by ID or by type (backwards compat)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageIdOrType);
      const currentStage = isUUID
        ? tournament.stages.find(s => s.id === stageIdOrType)
        : tournament.stages.find(s => s.stage === stageIdOrType);
      if (!currentStage) return res.status(400).json({ error: `Stage not found` });

      // Find next stage via feedsIntoStageId link
      let nextStage;
      if (currentStage.feedsIntoStageId) {
        nextStage = tournament.stages.find(s => s.id === currentStage.feedsIntoStageId);
      } else {
        // Legacy fallback: derive from stage type
        const nextType = currentStage.stage === 'CLUB_QUALIFIER' ? 'REGIONAL' : 'NATIONAL_FINAL';
        nextStage = tournament.stages.find(s => s.stage === nextType);
      }
      if (!nextStage) return res.status(400).json({ error: 'No next stage configured — this stage has no progression target' });

      const qualifyCount = currentStage.qualifyCount;
      const stageFrom = currentStage.stage;

      // Find completed matches in this stage
      const completedMatches = await prisma.match.findMany({
        where: {
          tournamentId,
          stage: stageFrom,
          status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] },
        },
        include: { playerA: true, playerB: true },
        orderBy: [{ roundNumber: 'desc' }, { matchNumber: 'asc' }],
      });

      if (completedMatches.length === 0) {
        return res.status(400).json({ error: 'No completed matches found in this stage' });
      }

      const maxRound = Math.max(...completedMatches.map(m => m.roundNumber));
      const finalMatches = completedMatches.filter(m => m.roundNumber === maxRound);

      // Collect qualifiers
      const qualifiedPlayerIds = new Set();
      for (const match of finalMatches) {
        if (match.winnerId) {
          qualifiedPlayerIds.add(match.winnerId);
          if (qualifyCount >= 2) {
            const loserId = match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
            if (loserId) qualifiedPlayerIds.add(loserId);
          }
        }
      }

      if (qualifyCount > 2) {
        const semiFinals = completedMatches.filter(m => m.roundNumber === maxRound - 1);
        for (const match of semiFinals) {
          const loserId = match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
          if (loserId && qualifiedPlayerIds.size < qualifyCount * finalMatches.length) {
            qualifiedPlayerIds.add(loserId);
          }
        }
      }

      // Create entries in next stage
      const promoted = [];
      for (const playerId of qualifiedPlayerIds) {
        const existingEntry = await prisma.tournamentEntry.findFirst({
          where: { tournamentId, playerId, stage: nextStage.stage },
        });
        if (existingEntry) continue;

        const originalEntry = await prisma.tournamentEntry.findFirst({
          where: { tournamentId, playerId },
        });

        const entry = await prisma.tournamentEntry.create({
          data: {
            tournamentId,
            playerId,
            clubId: originalEntry?.clubId || '',
            stage: nextStage.stage,
            status: 'ACTIVE',
            paymentStatus: 'COMPLETED',
            handicapAtEntry: originalEntry?.handicapAtEntry,
          },
        });
        promoted.push(entry);

        if (originalEntry) {
          await prisma.tournamentEntry.update({
            where: { id: originalEntry.id },
            data: { status: 'PROMOTED' },
          });
        }
      }

      // Award ranking points
      const points = RANKING_POINTS[stageFrom] || {};
      for (const match of finalMatches) {
        if (match.winnerId) {
          await prisma.player.update({
            where: { id: match.winnerId },
            data: { rankingPoints: { increment: points.winner || 0 } },
          });
          const loserId = match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
          if (loserId) {
            await prisma.player.update({
              where: { id: loserId },
              data: { rankingPoints: { increment: points.finalist || 0 } },
            });
          }
        }
      }

      const semiFinals = completedMatches.filter(m => m.roundNumber === maxRound - 1);
      for (const match of semiFinals) {
        const loserId = match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
        if (loserId) {
          await prisma.player.update({
            where: { id: loserId },
            data: { rankingPoints: { increment: points.semifinalist || 0 } },
          });
        }
      }

      res.json({
        message: `Promoted ${promoted.length} players from "${currentStage.name}" to "${nextStage.name}"`,
        qualifyCount,
        promotedCount: promoted.length,
        promoted,
      });
    } catch (err) {
      console.error('Stage progression error:', err);
      res.status(500).json({ error: 'Failed to progress stage' });
    }
  }
);

// ─── SUBSCRIPTION TIERS (Admin-managed) ─────────────────────────────────────

router.get('/subscription-tiers', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const tiers = await prisma.subscriptionTier.findMany({
      include: { _count: { select: { clubSubscriptions: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription tiers' });
  }
});

router.post('/subscription-tiers',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  body('amountPence').isInt({ min: 0 }),
  validate,
  async (req, res) => {
    try {
      const tier = await prisma.subscriptionTier.create({
        data: {
          name: req.body.name,
          slug: req.body.slug,
          amountPence: req.body.amountPence,
          features: req.body.features || [],
          sortOrder: req.body.sortOrder || 0,
        },
      });
      res.status(201).json(tier);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Tier name or slug already exists' });
      res.status(500).json({ error: 'Failed to create subscription tier' });
    }
  }
);

router.put('/subscription-tiers/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const { name, amountPence, features, isActive, sortOrder } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (amountPence !== undefined) data.amountPence = amountPence;
      if (features !== undefined) data.features = features;
      if (isActive !== undefined) data.isActive = isActive;
      if (sortOrder !== undefined) data.sortOrder = sortOrder;

      const tier = await prisma.subscriptionTier.update({
        where: { id: req.params.id },
        data,
      });
      res.json(tier);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update subscription tier' });
    }
  }
);

router.delete('/subscription-tiers/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      await prisma.subscriptionTier.delete({ where: { id: req.params.id } });
      res.json({ message: 'Tier deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete subscription tier' });
    }
  }
);

module.exports = router;

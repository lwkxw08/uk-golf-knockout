const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');

const { geocodePostcode, haversineDistanceMiles } = require('../services/geocodeService');
const { logAudit } = require('../services/auditService');

const router = express.Router();

// Public: list tournaments with text search and postcode/radius
router.get('/', async (req, res) => {
  try {
    const { status, format, ageCategory, search, postcode, radius = 25, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (format) where.formatType = format;
    if (ageCategory) where.ageCategory = ageCategory;

    // Free text search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { season: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Postcode + radius: find tournaments that have entries from clubs near the postcode
    let userCoords = null;
    if (postcode) {
      userCoords = await geocodePostcode(postcode);
      if (!userCoords) {
        return res.status(400).json({ error: 'Invalid postcode' });
      }
    }

    if (userCoords) {
      // Find clubs within radius
      const allClubs = await prisma.club.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { id: true, latitude: true, longitude: true },
      });

      const radiusMiles = Number(radius);
      const nearbyClubIds = allClubs
        .filter(c => haversineDistanceMiles(userCoords.latitude, userCoords.longitude, Number(c.latitude), Number(c.longitude)) <= radiusMiles)
        .map(c => c.id);

      if (nearbyClubIds.length === 0) {
        return res.json({ tournaments: [], total: 0, page: 1, totalPages: 0 });
      }

      // Find tournaments that have entries from these clubs
      where.entries = { some: { clubId: { in: nearbyClubIds } } };
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          _count: { select: { entries: true } },
          pricing: { where: { isActive: true, feeType: 'ENTRY_FEE' }, take: 1 },
          stages: { select: { id: true, name: true, isLeague: true } },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tournament.count({ where }),
    ]);

    res.json({ tournaments, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Tournament list error:', err);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Public: get tournament details
router.get('/:id',
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const tournament = await prisma.tournament.findUnique({
        where: { id: req.params.id },
        include: {
          pricing: { where: { isActive: true } },
          stages: {
            orderBy: { stageOrder: 'asc' },
            include: {
              stageRegions: { include: { region: true } },
              prizes: { orderBy: { position: 'asc' } },
              feedsInto: { select: { id: true, name: true, stage: true } },
              fedBy: { select: { id: true, name: true, stage: true } },
            },
          },
          sponsors: { where: { isActive: true } },
          draws: true,
          prizes: { orderBy: { position: 'asc' } },
          _count: { select: { entries: true, matches: true } },
        },
      });
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  }
);

// Admin: create tournament with dynamic stages, prizes, regions
router.post('/',
  authenticate,
  requireRole('ADMIN'),
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  body('season').trim().notEmpty(),
  body('formatType').isIn([
    'SINGLES_MATCHPLAY', 'SINGLES_STROKEPLAY', 'SINGLES_STABLEFORD',
    'PAIRS_MATCHPLAY', 'PAIRS_BESTBALL', 'PAIRS_FOURSOMES', 'PAIRS_GREENSOMES',
    'TEAM_MATCHPLAY', 'TEAM_STROKEPLAY', 'TEAM_STABLEFORD',
  ]),
  body('scoringSystem').isIn(['MATCHPLAY', 'STROKEPLAY', 'STABLEFORD', 'BEST_BALL']),
  body('ageCategory').optional().isIn(['OPEN', 'JUNIOR', 'SENIOR']),
  body('genderCategory').optional().isIn(['MEN', 'WOMEN', 'MIXED']),
  body('teamSize').optional().isInt({ min: 1 }),
  body('handicapAllowancePct').optional().isInt({ min: 0, max: 100 }),
  validate,
  async (req, res) => {
    try {
      const {
        name, slug, season, description, rulesText,
        formatType, scoringSystem, teamSize = 1, isKnockout = true,
        handicapAllowancePct = 100, maxHandicap,
        ageCategory = 'OPEN', genderCategory = 'MIXED', minAge, maxAge,
        enableLeaderboard = false, stablefordConfig,
        registrationOpens, registrationDeadline, startDate, endDate,
        stages, pricing, prizes,
      } = req.body;

      const tournament = await prisma.tournament.create({
        data: {
          name, slug, season, description, rulesText,
          formatType, scoringSystem, teamSize, isKnockout,
          handicapAllowancePct, maxHandicap,
          ageCategory, genderCategory, minAge, maxAge,
          enableLeaderboard,
          stablefordConfig: stablefordConfig || null,
          registrationOpens: registrationOpens ? new Date(registrationOpens) : null,
          registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      // Create stages dynamically — supports tree structure
      // Each stage has a tempId (frontend-assigned) and feedsIntoTempId
      // We create stages in order, then resolve feedsIntoStageId links
      if (stages && stages.length > 0) {
        const tempIdToRealId = {};

        // First pass: create all stage records
        for (const s of stages) {
          // Auto-calculate knockout rounds from maxParticipants if provided
          let totalRounds = s.totalRounds || 1;
          if (s.maxParticipants && s.maxParticipants > 1) {
            totalRounds = Math.ceil(Math.log2(s.maxParticipants));
          }

          const stageRecord = await prisma.tournamentStage_.create({
            data: {
              tournamentId: tournament.id,
              stage: s.stage,
              stageOrder: s.stageOrder,
              name: s.name,
              maxParticipants: s.maxParticipants || null,
              totalRounds,
              qualifyCount: s.stage === 'NATIONAL_FINAL' ? 0 : (s.qualifyCount || 1),
              matchDeadlineDays: s.matchDeadlineDays,
            },
          });
          if (s.tempId) tempIdToRealId[s.tempId] = stageRecord.id;

          // Link regions
          if (s.regionIds && s.regionIds.length > 0) {
            for (const regionId of s.regionIds) {
              await prisma.tournamentStageRegion.create({
                data: { stageId: stageRecord.id, regionId },
              });
            }
          }

          // Stage prizes
          if (s.prizes && s.prizes.length > 0) {
            for (const p of s.prizes) {
              await prisma.prize.create({
                data: {
                  tournamentId: tournament.id,
                  stageId: stageRecord.id,
                  position: p.position,
                  description: p.description,
                  valuePence: p.valuePence || null,
                  prizeType: p.prizeType || 'trophy',
                },
              });
            }
          }
        }

        // Second pass: resolve feedsIntoStageId links
        for (const s of stages) {
          if (s.feedsIntoTempId && s.tempId && tempIdToRealId[s.tempId] && tempIdToRealId[s.feedsIntoTempId]) {
            await prisma.tournamentStage_.update({
              where: { id: tempIdToRealId[s.tempId] },
              data: { feedsIntoStageId: tempIdToRealId[s.feedsIntoTempId] },
            });
          }
        }
      } else {
        // Default: Club → Regional → National chain
        const national = await prisma.tournamentStage_.create({
          data: { tournamentId: tournament.id, stage: 'NATIONAL_FINAL', stageOrder: 3, name: 'National Final', totalRounds: 4, qualifyCount: 0 },
        });
        const regional = await prisma.tournamentStage_.create({
          data: { tournamentId: tournament.id, stage: 'REGIONAL', stageOrder: 2, name: 'Regional', totalRounds: 3, feedsIntoStageId: national.id },
        });
        await prisma.tournamentStage_.create({
          data: { tournamentId: tournament.id, stage: 'CLUB_QUALIFIER', stageOrder: 1, name: 'Club Qualifier', totalRounds: 4, feedsIntoStageId: regional.id },
        });
      }

      // Tournament-level prizes (e.g. overall leaderboard prize)
      if (prizes && prizes.length > 0) {
        for (const p of prizes) {
          await prisma.prize.create({
            data: {
              tournamentId: tournament.id,
              position: p.position,
              description: p.description,
              valuePence: p.valuePence || null,
              prizeType: p.prizeType || 'trophy',
            },
          });
        }
      }

      // Create pricing
      if (pricing && pricing.length > 0) {
        for (const p of pricing) {
          await prisma.tournamentPricing.create({
            data: { tournamentId: tournament.id, ...p },
          });
        }
      } else {
        await prisma.tournamentPricing.create({
          data: {
            tournamentId: tournament.id,
            feeType: 'ENTRY_FEE',
            amountPence: 2500,
            clubSharePct: 50,
            platformSharePct: 50,
            description: 'Standard entry fee',
          },
        });
      }

      const created = await prisma.tournament.findUnique({
        where: { id: tournament.id },
        include: {
          stages: { include: { stageRegions: { include: { region: true } }, prizes: true } },
          pricing: true,
          prizes: true,
        },
      });

      res.status(201).json(created);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
      console.error('Create tournament error:', err);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  }
);

// Admin: update tournament
router.put('/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const dateFields = ['registrationOpens', 'registrationDeadline', 'startDate', 'endDate'];
      const allowedFields = [
        'name', 'slug', 'season', 'description', 'rulesText', 'status',
        'formatType', 'scoringSystem', 'teamSize', 'isKnockout',
        'handicapAllowancePct', 'maxHandicap',
        'ageCategory', 'genderCategory', 'minAge', 'maxAge',
        'enableLeaderboard', 'bannerUrl',
        ...dateFields,
      ];
      const data = {};
      for (const f of allowedFields) {
        if (req.body[f] !== undefined) {
          if (dateFields.includes(f)) {
            data[f] = req.body[f] ? new Date(req.body[f]) : null;
          } else {
            data[f] = req.body[f];
          }
        }
      }

      const tournament = await prisma.tournament.update({
        where: { id: req.params.id },
        data,
        include: {
          stages: { include: { stageRegions: { include: { region: true } }, prizes: true } },
          pricing: true, prizes: true,
        },
      });
      logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'TOURNAMENT_UPDATED', entity: 'Tournament', entityId: req.params.id, details: { name: tournament.name, fields: Object.keys(data) }, ipAddress: req.ip });
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  }
);

// Admin: update tournament pricing
router.put('/:id/pricing/:pricingId',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  param('pricingId').isUUID(),
  body('amountPence').optional().isInt({ min: 0 }),
  body('clubSharePct').optional().isInt({ min: 0, max: 100 }),
  body('platformSharePct').optional().isInt({ min: 0, max: 100 }),
  validate,
  async (req, res) => {
    try {
      const { amountPence, clubSharePct, platformSharePct, description, isActive } = req.body;
      const pricing = await prisma.tournamentPricing.update({
        where: { id: req.params.pricingId },
        data: { amountPence, clubSharePct, platformSharePct, description, isActive },
      });
      res.json(pricing);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  }
);

// Admin: add pricing to tournament
router.post('/:id/pricing',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  body('feeType').isIn(['ENTRY_FEE', 'LATE_ENTRY', 'PLAYER_MEMBERSHIP', 'CLUB_SUBSCRIPTION', 'SPECTATOR', 'OTHER']),
  body('amountPence').isInt({ min: 0 }),
  body('clubSharePct').isInt({ min: 0, max: 100 }),
  body('platformSharePct').isInt({ min: 0, max: 100 }),
  validate,
  async (req, res) => {
    try {
      const pricing = await prisma.tournamentPricing.create({
        data: { tournamentId: req.params.id, ...req.body },
      });
      res.status(201).json(pricing);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add pricing' });
    }
  }
);

module.exports = router;

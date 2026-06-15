const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');
const config = require('../config');
const { logAudit } = require('../services/auditService');
const { getMembershipDurationMonths } = require('../services/membershipScheduler');

const router = express.Router();

// Get player's membership status
router.get('/me', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const membership = await prisma.playerMembership.findFirst({
      where: { playerId: player.id, status: { in: ['ACTIVE', 'PAST_DUE'] } },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    res.json({
      hasMembership: !!membership,
      membership,
      membershipType: player.membershipType,
      membershipExpiry: player.membershipExpiry,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch membership' });
  }
});

// Subscribe to player membership
router.post('/subscribe',
  authenticate,
  body('tier').optional().default('standard'),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(400).json({ error: 'Player profile required' });

      const existing = await prisma.playerMembership.findFirst({
        where: { playerId: player.id, status: 'ACTIVE' },
      });
      if (existing) return res.status(409).json({ error: 'Already have active membership' });

      // Get membership pricing from platform pricing
      const pricing = await prisma.platformPricing.findFirst({
        where: { pricingKey: 'player_membership_annual' },
      });
      const amountPence = pricing?.amountPence || 3900;

      const durationMonths = await getMembershipDurationMonths();
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      // If Stripe is configured, create a payment intent
      if (config.stripe.secretKey) {
        const stripe = require('stripe')(config.stripe.secretKey);

        let customerId = player.stripeCustomerId;
        if (!customerId) {
          const user = await prisma.user.findUnique({ where: { id: req.user.id } });
          const customer = await stripe.customers.create({
            email: user.email,
            name: `${player.firstName} ${player.lastName}`,
          });
          customerId = customer.id;
          await prisma.player.update({
            where: { id: player.id },
            data: { stripeCustomerId: customerId },
          });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountPence,
          currency: 'gbp',
          customer: customerId,
          metadata: { type: 'player_membership', playerId: player.id },
        });

        return res.json({
          clientSecret: paymentIntent.client_secret,
          amountPence,
          requiresPayment: true,
        });
      }

      // No Stripe: create membership directly (dev/testing mode)
      const membership = await prisma.playerMembership.create({
        data: {
          playerId: player.id,
          tier: req.body.tier || 'standard',
          amountPence,
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        },
      });

      await prisma.player.update({
        where: { id: player.id },
        data: { membershipType: 'premium', membershipExpiry: endDate },
      });

      res.status(201).json(membership);
    } catch (err) {
      console.error('Membership subscribe error:', err);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  }
);

// Cancel membership
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(400).json({ error: 'Player not found' });

    const membership = await prisma.playerMembership.findFirst({
      where: { playerId: player.id, status: 'ACTIVE' },
    });
    if (!membership) return res.status(404).json({ error: 'No active membership' });

    await prisma.playerMembership.update({
      where: { id: membership.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    res.json({ message: 'Membership cancelled. Access continues until period end.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel membership' });
  }
});

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────────────────

// Get membership settings
router.get('/admin/settings', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const duration = await getMembershipDurationMonths();
    const pricing = await prisma.platformPricing.findFirst({ where: { pricingKey: 'player_membership_annual' } });
    res.json({
      durationMonths: duration,
      amountPence: pricing?.amountPence || 3900,
      pricingId: pricing?.id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update membership duration
router.put('/admin/settings',
  authenticate,
  requireRole('ADMIN'),
  body('durationMonths').isInt({ min: 1, max: 60 }),
  validate,
  async (req, res) => {
    try {
      const { durationMonths } = req.body;
      await prisma.systemSetting.upsert({
        where: { key: 'membership_duration_months' },
        update: { value: String(durationMonths) },
        create: { key: 'membership_duration_months', value: String(durationMonths), label: 'Membership Duration (months)', category: 'membership' },
      });
      logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'MEMBERSHIP_DURATION_CHANGED', entity: 'SystemSetting', details: { durationMonths }, ipAddress: req.ip });
      res.json({ message: 'Duration updated', durationMonths });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update duration' });
    }
  }
);

// List all memberships (admin)
router.get('/admin/all', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search, expiring } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    if (search) {
      where.player = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    // Filter memberships expiring within X days
    if (expiring) {
      const days = parseInt(expiring);
      const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      where.currentPeriodEnd = { lte: future, gt: new Date() };
      where.status = 'ACTIVE';
    }

    const [memberships, total] = await Promise.all([
      prisma.playerMembership.findMany({
        where,
        include: {
          player: {
            select: { id: true, firstName: true, lastName: true, handicapIndex: true, user: { select: { email: true } } },
          },
        },
        orderBy: { currentPeriodEnd: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.playerMembership.count({ where }),
    ]);

    res.json({ memberships, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Admin membership list error:', err);
    res.status(500).json({ error: 'Failed to fetch memberships' });
  }
});

// Admin: get membership stats
router.get('/admin/stats', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [active, expired, cancelled, expiringIn30, expiringIn7, totalRevenue] = await Promise.all([
      prisma.playerMembership.count({ where: { status: 'ACTIVE' } }),
      prisma.playerMembership.count({ where: { status: 'EXPIRED' } }),
      prisma.playerMembership.count({ where: { status: 'CANCELLED' } }),
      prisma.playerMembership.count({ where: { status: 'ACTIVE', currentPeriodEnd: { lte: in30, gt: now } } }),
      prisma.playerMembership.count({ where: { status: 'ACTIVE', currentPeriodEnd: { lte: in7, gt: now } } }),
      prisma.playerMembership.aggregate({ where: { status: { in: ['ACTIVE', 'EXPIRED'] } }, _sum: { amountPence: true } }),
    ]);

    res.json({ active, expired, cancelled, expiringIn30, expiringIn7, totalRevenue: totalRevenue._sum.amountPence || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Admin: extend a membership
router.post('/admin/:id/extend',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  body('months').isInt({ min: 1, max: 24 }),
  validate,
  async (req, res) => {
    try {
      const membership = await prisma.playerMembership.findUnique({
        where: { id: req.params.id },
        include: { player: { include: { user: { select: { email: true } } } } },
      });
      if (!membership) return res.status(404).json({ error: 'Membership not found' });

      const newEnd = new Date(membership.currentPeriodEnd);
      newEnd.setMonth(newEnd.getMonth() + parseInt(req.body.months));

      const updated = await prisma.playerMembership.update({
        where: { id: req.params.id },
        data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
      });

      await prisma.player.update({
        where: { id: membership.playerId },
        data: { membershipType: 'premium', membershipExpiry: newEnd },
      });

      logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'MEMBERSHIP_EXTENDED', entity: 'PlayerMembership', entityId: req.params.id, details: { months: req.body.months, newEnd, playerEmail: membership.player.user.email }, ipAddress: req.ip });
      res.json({ message: 'Membership extended', membership: updated });
    } catch (err) {
      res.status(500).json({ error: 'Failed to extend membership' });
    }
  }
);

// Admin: revoke/expire a membership
router.post('/admin/:id/revoke',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  async (req, res) => {
    try {
      const membership = await prisma.playerMembership.findUnique({
        where: { id: req.params.id },
        include: { player: { include: { user: { select: { email: true } } } } },
      });
      if (!membership) return res.status(404).json({ error: 'Membership not found' });

      await prisma.playerMembership.update({
        where: { id: req.params.id },
        data: { status: 'EXPIRED', expiryNotifSent: true },
      });

      await prisma.player.update({
        where: { id: membership.playerId },
        data: { membershipType: 'free', membershipExpiry: null },
      });

      logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'MEMBERSHIP_REVOKED', entity: 'PlayerMembership', entityId: req.params.id, details: { playerEmail: membership.player.user.email }, ipAddress: req.ip });
      res.json({ message: 'Membership revoked' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to revoke membership' });
    }
  }
);

// Admin: manually trigger reminder check
router.post('/admin/send-reminders', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { checkMembershipReminders } = require('../services/membershipScheduler');
    await checkMembershipReminders();
    res.json({ message: 'Reminder check completed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run reminders' });
  }
});

// Renew membership (player)
router.post('/renew', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(400).json({ error: 'Player profile required' });

    const existing = await prisma.playerMembership.findFirst({
      where: { playerId: player.id },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    if (existing?.status === 'ACTIVE') {
      return res.status(409).json({ error: 'Already have active membership' });
    }

    const pricing = await prisma.platformPricing.findFirst({ where: { pricingKey: 'player_membership_annual' } });
    const amountPence = pricing?.amountPence || 3900;
    const durationMonths = await getMembershipDurationMonths();

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    // If Stripe configured, create payment intent
    if (config.stripe.secretKey) {
      const stripe = require('stripe')(config.stripe.secretKey);
      let customerId = player.stripeCustomerId;
      if (!customerId) {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const customer = await stripe.customers.create({ email: user.email, name: `${player.firstName} ${player.lastName}` });
        customerId = customer.id;
        await prisma.player.update({ where: { id: player.id }, data: { stripeCustomerId: customerId } });
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountPence, currency: 'gbp', customer: customerId,
        metadata: { type: 'player_membership_renewal', playerId: player.id, renewedFromId: existing?.id },
      });
      return res.json({ clientSecret: paymentIntent.client_secret, amountPence, requiresPayment: true });
    }

    // No Stripe: renew directly
    const membership = await prisma.playerMembership.create({
      data: {
        playerId: player.id,
        tier: existing?.tier || 'standard',
        amountPence,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        renewedFromId: existing?.id,
      },
    });

    await prisma.player.update({
      where: { id: player.id },
      data: { membershipType: 'premium', membershipExpiry: endDate },
    });

    res.status(201).json(membership);
  } catch (err) {
    console.error('Membership renew error:', err);
    res.status(500).json({ error: 'Failed to renew' });
  }
});

module.exports = router;

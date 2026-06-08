const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../config/prisma');
const config = require('../config');

const router = express.Router();

// Public: list available subscription tiers
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await prisma.subscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// Club manager: get own subscription
router.get('/my-subscription', authenticate, async (req, res) => {
  try {
    const mgr = await prisma.clubManager.findUnique({ where: { userId: req.user.id } });
    if (!mgr) return res.status(404).json({ error: 'Not a club manager' });

    const subscription = await prisma.clubSubscription.findFirst({
      where: { clubId: mgr.clubId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
      include: { tier: true },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    res.json({ subscription });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Club manager: subscribe to a tier
router.post('/subscribe',
  authenticate,
  body('tierId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const mgr = await prisma.clubManager.findUnique({
        where: { userId: req.user.id },
        include: { club: true },
      });
      if (!mgr) return res.status(403).json({ error: 'Not a club manager' });

      const tier = await prisma.subscriptionTier.findUnique({ where: { id: req.body.tierId } });
      if (!tier || !tier.isActive) return res.status(404).json({ error: 'Tier not found' });

      const existing = await prisma.clubSubscription.findFirst({
        where: { clubId: mgr.clubId, status: 'ACTIVE' },
      });
      if (existing) return res.status(409).json({ error: 'Club already has an active subscription' });

      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);

      if (config.stripe.secretKey) {
        const stripe = require('stripe')(config.stripe.secretKey);

        let customerId = mgr.club.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: mgr.club.email || req.user.email,
            name: mgr.club.name,
          });
          customerId = customer.id;
          await prisma.club.update({
            where: { id: mgr.clubId },
            data: { stripeCustomerId: customerId },
          });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: tier.amountPence,
          currency: 'gbp',
          customer: customerId,
          metadata: { type: 'club_subscription', clubId: mgr.clubId, tierId: tier.id },
        });

        return res.json({
          clientSecret: paymentIntent.client_secret,
          amountPence: tier.amountPence,
          requiresPayment: true,
        });
      }

      // No Stripe: create subscription directly
      const subscription = await prisma.clubSubscription.create({
        data: {
          clubId: mgr.clubId,
          tierId: tier.id,
          amountPence: tier.amountPence,
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        },
        include: { tier: true },
      });

      res.status(201).json(subscription);
    } catch (err) {
      console.error('Club subscribe error:', err);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  }
);

// Admin: list all club subscriptions
router.get('/all',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const subscriptions = await prisma.clubSubscription.findMany({
        include: {
          club: { select: { id: true, name: true, slug: true } },
          tier: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(subscriptions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
  }
);

// Cancel subscription
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const mgr = await prisma.clubManager.findUnique({ where: { userId: req.user.id } });
    if (!mgr) return res.status(403).json({ error: 'Not a club manager' });

    const sub = await prisma.clubSubscription.findFirst({
      where: { clubId: mgr.clubId, status: 'ACTIVE' },
    });
    if (!sub) return res.status(404).json({ error: 'No active subscription' });

    await prisma.clubSubscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    res.json({ message: 'Subscription cancelled. Access continues until period end.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;

const express = require('express');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const config = require('../config');

const router = express.Router();

let stripe = null;
if (config.stripe.secretKey) {
  stripe = require('stripe')(config.stripe.secretKey);
}

// Create payment intent for tournament entry
router.post('/entry/:entryId/pay',
  authenticate,
  param('entryId').isUUID(),
  validate,
  async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ error: 'Payments not configured. Admin must add Stripe API keys in Settings.' });

      const entry = await prisma.tournamentEntry.findUnique({
        where: { id: req.params.entryId },
        include: {
          tournament: { include: { pricing: { where: { feeType: 'ENTRY_FEE', isActive: true }, take: 1 } } },
          player: true,
        },
      });

      if (!entry) return res.status(404).json({ error: 'Entry not found' });
      if (entry.paymentStatus === 'COMPLETED') {
        return res.status(400).json({ error: 'Already paid' });
      }

      const amount = entry.tournament.pricing[0]?.amountPence || 0;
      if (amount === 0) {
        await prisma.tournamentEntry.update({
          where: { id: entry.id },
          data: { paymentStatus: 'COMPLETED', status: 'ACTIVE' },
        });
        return res.json({ free: true });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'gbp',
        metadata: {
          entryId: entry.id,
          tournamentId: entry.tournamentId,
          playerId: entry.playerId,
          clubId: entry.clubId,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret, amount });
    } catch (err) {
      console.error('Payment error:', err);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }
);

// Create Checkout Session for membership
router.post('/membership/checkout',
  authenticate,
  body('planId').notEmpty(),
  validate,
  async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ error: 'Payments not configured. Admin must add Stripe API keys in Settings.' });

      const { planId } = req.body;

      const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Plan not found' });

      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(404).json({ error: 'Player not found' });

      // Create or get Stripe customer
      let customerId = player.stripeCustomerId;
      if (!customerId) {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${player.firstName} ${player.lastName}`,
          metadata: { playerId: player.id, userId: user.id },
        });
        customerId = customer.id;
        await prisma.player.update({
          where: { id: player.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: plan.interval ? 'subscription' : 'payment',
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: plan.name,
              description: plan.description || `${plan.name} membership`,
            },
            unit_amount: plan.amountPence,
            ...(plan.interval && { recurring: { interval: plan.interval } }),
          },
          quantity: 1,
        }],
        success_url: `${config.clientUrl}/membership?success=true&plan=${planId}`,
        cancel_url: `${config.clientUrl}/membership?cancelled=true`,
        metadata: { playerId: player.id, planId },
      });

      res.json({ sessionUrl: session.url, sessionId: session.id });
    } catch (err) {
      console.error('Checkout error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// Create Checkout Session for club subscription
router.post('/subscription/checkout',
  authenticate,
  body('planId').notEmpty(),
  body('clubId').isUUID(),
  validate,
  async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

      const { planId, clubId } = req.body;

      const plan = await prisma.clubSubscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Plan not found' });

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${plan.name} — Club Subscription`,
              description: plan.features?.join(', ') || plan.name,
            },
            unit_amount: plan.monthlyPricePence,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        success_url: `${config.clientUrl}/club-portal?subscription=success`,
        cancel_url: `${config.clientUrl}/subscriptions?cancelled=true`,
        metadata: { clubId, planId, userId: req.user.id },
      });

      res.json({ sessionUrl: session.url, sessionId: session.id });
    } catch (err) {
      console.error('Subscription checkout error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// Get payment status
router.get('/status', authenticate, async (req, res) => {
  try {
    const configured = !!stripe;
    res.json({ configured, provider: 'stripe' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Stripe webhook
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        config.stripe.webhookSecret
      );
    } catch (err) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const { entryId, tournamentId, clubId } = pi.metadata;

      if (entryId) {
        const entry = await prisma.tournamentEntry.update({
          where: { id: entryId },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'ACTIVE',
            stripePaymentId: pi.id,
          },
          include: { tournament: { include: { pricing: { where: { feeType: 'ENTRY_FEE', isActive: true }, take: 1 } } } },
        });

        const pricing = entry.tournament.pricing[0];
        if (pricing) {
          const clubAmount = Math.round(pi.amount * pricing.clubSharePct / 100);
          const platformAmount = pi.amount - clubAmount;

          await prisma.revenueTransaction.create({
            data: {
              type: 'ENTRY_FEE',
              totalAmountPence: pi.amount,
              clubAmountPence: clubAmount,
              platformAmountPence: platformAmount,
              clubId,
              tournamentId,
              playerId: entry.playerId,
              stripePaymentId: pi.id,
              status: 'COMPLETED',
            },
          });
        }
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { playerId, planId, clubId } = session.metadata || {};

      if (playerId && planId) {
        // Player membership activated
        await prisma.playerMembership.create({
          data: {
            playerId,
            planId,
            status: 'ACTIVE',
            stripeSubscriptionId: session.subscription || session.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
        await prisma.player.update({
          where: { id: playerId },
          data: { membershipType: 'premium' },
        });
      }

      if (clubId && planId) {
        // Club subscription activated
        await prisma.clubSubscription.upsert({
          where: { clubId },
          update: {
            planId,
            status: 'ACTIVE',
            stripeSubscriptionId: session.subscription || session.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          create: {
            clubId,
            planId,
            status: 'ACTIVE',
            stripeSubscriptionId: session.subscription || session.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;

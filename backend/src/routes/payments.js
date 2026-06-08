const express = require('express');
const { param } = require('express-validator');
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
      if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

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

        // Record revenue with split
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

    res.json({ received: true });
  }
);

module.exports = router;

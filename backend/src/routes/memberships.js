const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const config = require('../config');

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

      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);

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

module.exports = router;

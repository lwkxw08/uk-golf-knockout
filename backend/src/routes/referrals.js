const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const crypto = require('crypto');

const router = express.Router();

// Get my referral info (code, stats, history)
router.get('/my', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Get or create referral code
    let existingCode = await prisma.referral.findFirst({
      where: { referrerPlayerId: player.id, referredPlayerId: null, status: 'pending' },
    });

    if (!existingCode) {
      const code = `GOLF${player.firstName?.substring(0, 2).toUpperCase() || 'XX'}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      existingCode = await prisma.referral.create({
        data: {
          referrerPlayerId: player.id,
          referralCode: code,
        },
      });
    }

    // Get all referrals made by this player
    const referrals = await prisma.referral.findMany({
      where: { referrerPlayerId: player.id },
      include: {
        referredPlayer: {
          select: { firstName: true, lastName: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completed = referrals.filter((r) => r.status === 'redeemed');
    const pending = referrals.filter((r) => r.status === 'registered');
    const totalEarned = completed.reduce((sum, r) => sum + r.discountPence, 0);

    res.json({
      referralCode: existingCode.referralCode,
      shareUrl: `${req.protocol}://${req.get('host')}/register?ref=${existingCode.referralCode}`,
      stats: {
        totalReferred: referrals.filter((r) => r.referredPlayerId).length,
        completed: completed.length,
        pending: pending.length,
        totalEarnedPence: totalEarned,
      },
      referrals: referrals
        .filter((r) => r.referredPlayerId)
        .map((r) => ({
          id: r.id,
          referredPlayer: r.referredPlayer
            ? `${r.referredPlayer.firstName} ${r.referredPlayer.lastName}`
            : r.referredEmail,
          status: r.status,
          discountPence: r.discountPence,
          createdAt: r.createdAt,
          redeemedAt: r.redeemedAt,
        })),
    });
  } catch (err) {
    console.error('Referral info error:', err);
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
});

// Validate a referral code (public, used during registration)
router.get('/validate/:code', async (req, res) => {
  try {
    const referral = await prisma.referral.findUnique({
      where: { referralCode: req.params.code },
      include: {
        referrer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!referral) return res.status(404).json({ error: 'Invalid referral code' });

    res.json({
      valid: true,
      referrerName: `${referral.referrer.firstName} ${referral.referrer.lastName}`,
      discountPence: referral.discountPence,
      discountText: `\u00a3${(referral.discountPence / 100).toFixed(2)} off your first entry fee`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate code' });
  }
});

// Redeem a referral (called after registration)
router.post('/redeem',
  authenticate,
  body('referralCode').trim().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
      if (!player) return res.status(404).json({ error: 'Player not found' });

      const referral = await prisma.referral.findUnique({
        where: { referralCode: req.body.referralCode },
      });

      if (!referral) return res.status(404).json({ error: 'Invalid referral code' });
      if (referral.referrerPlayerId === player.id) {
        return res.status(400).json({ error: 'Cannot use your own referral code' });
      }

      // Check if player already used a referral
      const alreadyReferred = await prisma.referral.findFirst({
        where: { referredPlayerId: player.id },
      });
      if (alreadyReferred) {
        return res.status(400).json({ error: 'You have already used a referral code' });
      }

      // Create new referral record for this specific referred player
      const redeemed = await prisma.referral.create({
        data: {
          referrerPlayerId: referral.referrerPlayerId,
          referralCode: `${referral.referralCode}_${player.id.substring(0, 8)}`,
          referredPlayerId: player.id,
          referredEmail: req.user.email,
          status: 'redeemed',
          discountPence: referral.discountPence,
          referrerCredited: true,
          redeemedAt: new Date(),
        },
      });

      res.json({
        message: `Referral redeemed! Both you and the referrer get \u00a3${(referral.discountPence / 100).toFixed(2)} off.`,
        discountPence: referral.discountPence,
      });
    } catch (err) {
      console.error('Referral redeem error:', err);
      res.status(500).json({ error: 'Failed to redeem referral' });
    }
  }
);

// Generate a fresh sharing code
router.post('/generate', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const code = `GOLF${player.firstName?.substring(0, 2).toUpperCase() || 'XX'}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const referral = await prisma.referral.create({
      data: {
        referrerPlayerId: player.id,
        referralCode: code,
      },
    });

    res.json({
      referralCode: code,
      shareUrl: `${req.protocol}://${req.get('host')}/register?ref=${code}`,
    });
  } catch (err) {
    console.error('Generate referral error:', err);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

module.exports = router;

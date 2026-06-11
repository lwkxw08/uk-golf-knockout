const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const config = require('../config');
const { sendEmail, emailWrapper } = require('../services/emailService');

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Register with email verification
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('role').optional().isIn(['PLAYER', 'CLUB_MANAGER']),
  body('referralCode').optional().trim(),
  validate,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, role = 'PLAYER', referralCode } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 12);
      const verifyToken = generateToken();
      const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role,
          emailVerifyToken: verifyToken,
          emailVerifyExpiry: verifyExpiry,
        },
      });

      if (role === 'PLAYER') {
        await prisma.player.create({
          data: { userId: user.id, firstName, lastName },
        });
      }

      // Handle referral code
      if (referralCode && role === 'PLAYER') {
        try {
          const referrer = await prisma.referral.findFirst({
            where: { code: referralCode.toUpperCase() },
          });
          // referral logic is handled separately if the model exists
        } catch {}
      }

      // Send verification email (non-blocking — token is saved regardless)
      const verifyUrl = `${config.clientUrl}/verify-email?token=${verifyToken}`;
      try {
        const html = emailWrapper(`
          <h2 style="color:#111;margin-top:0;">Verify Your Email</h2>
          <p style="color:#374151;">Hi ${firstName},</p>
          <p style="color:#374151;">Welcome to UK Golf Knockout Network! Please verify your email address to activate your account.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${verifyUrl}" style="display:inline-block;background:#15803d;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Verify Email Address</a>
          </div>
          <p style="color:#6b7280;font-size:13px;">Or copy this link: ${verifyUrl}</p>
          <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours.</p>
        `);
        await sendEmail(email, 'Verify Your Email — UK Golf Knockout', html);
      } catch (emailErr) {
        console.warn('Failed to send verification email:', emailErr.message);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.status(201).json({
        token,
        user: { id: user.id, email: user.email, role: user.role, emailVerified: false },
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: req.params.token,
        emailVerifyExpiry: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });

    const verifyToken = generateToken();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry },
    });

    const verifyUrl = `${config.clientUrl}/verify-email?token=${verifyToken}`;
    try {
      const html = emailWrapper(`
        <h2 style="color:#111;margin-top:0;">Verify Your Email</h2>
        <p style="color:#374151;">Here is your new verification link:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${verifyUrl}" style="display:inline-block;background:#15803d;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Verify Email Address</a>
        </div>
        <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours.</p>
      `);
      await sendEmail(user.email, 'Verify Your Email — UK Golf Knockout', html);
    } catch (emailErr) {
      console.warn('Failed to send verification email:', emailErr.message);
    }

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification' });
  }
});

// Forgot password — send reset link
router.post('/forgot-password',
  body('email').isEmail().normalizeEmail(),
  validate,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { email: req.body.email } });

      // Always return success to prevent email enumeration
      if (!user) return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });

      const resetToken = generateToken();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry: resetExpiry },
      });

      const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
      try {
        const html = emailWrapper(`
          <h2 style="color:#111;margin-top:0;">Reset Your Password</h2>
          <p style="color:#374151;">We received a request to reset your password.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#15803d;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Reset Password</a>
          </div>
          <p style="color:#6b7280;font-size:13px;">Or copy this link: ${resetUrl}</p>
          <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        `);
        await sendEmail(user.email, 'Password Reset — UK Golf Knockout', html);
      } catch (emailErr) {
        console.warn('Failed to send reset email (token still saved):', emailErr.message);
      }

      res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Failed to process reset request' });
    }
  }
);

// Reset password with token
router.post('/reset-password',
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
  validate,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// Change password (authenticated)
router.post('/change-password',
  authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!await bcrypt.compare(req.body.currentPassword, user.passwordHash)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.isActive) return res.status(403).json({ error: 'Account disabled' });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, role: true, isActive: true, emailVerified: true,
        player: { include: { homeClub: { select: { id: true, name: true } } } },
        clubManager: { include: { club: { select: { id: true, name: true } } } },
      },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;

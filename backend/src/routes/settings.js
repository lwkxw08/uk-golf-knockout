const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Get all settings (admin only) — masks secret values
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    const masked = settings.map(s => ({
      ...s,
      value: s.isSecret && s.value ? '••••••' + s.value.slice(-4) : s.value,
    }));

    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update a setting
router.put('/:key',
  authenticate,
  requireAdmin,
  body('value').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const setting = await prisma.systemSetting.upsert({
        where: { key: req.params.key },
        update: { value: req.body.value },
        create: {
          key: req.params.key,
          value: req.body.value,
          label: req.body.label || req.params.key,
          category: req.body.category || 'general',
          isSecret: req.body.isSecret || false,
        },
      });

      // If updating SendGrid key, reinitialize the mail client
      if (req.params.key === 'SENDGRID_API_KEY' && req.body.value) {
        try {
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(req.body.value);
        } catch {}
      }

      res.json({
        ...setting,
        value: setting.isSecret ? '••••••' + setting.value.slice(-4) : setting.value,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
);

// Delete a setting
router.delete('/:key', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.systemSetting.delete({ where: { key: req.params.key } });
    res.json({ message: 'Setting deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

// Seed initial settings if none exist
router.post('/seed-defaults', authenticate, requireAdmin, async (req, res) => {
  try {
    const defaults = [
      { key: 'SENDGRID_API_KEY', label: 'SendGrid API Key', category: 'email', isSecret: true, value: '' },
      { key: 'SENDGRID_FROM_EMAIL', label: 'SendGrid From Email', category: 'email', isSecret: false, value: 'noreply@ukgolfknockout.com' },
      { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', category: 'payments', isSecret: true, value: '' },
      { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', category: 'payments', isSecret: false, value: '' },
      { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', category: 'payments', isSecret: true, value: '' },
      { key: 'PLATFORM_NAME', label: 'Platform Name', category: 'general', isSecret: false, value: 'UK Golf Knockout Network' },
      { key: 'SUPPORT_EMAIL', label: 'Support Email', category: 'general', isSecret: false, value: 'support@ukgolfknockout.com' },
    ];

    for (const d of defaults) {
      await prisma.systemSetting.upsert({
        where: { key: d.key },
        update: {},
        create: d,
      });
    }

    res.json({ message: 'Default settings seeded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed settings' });
  }
});

module.exports = router;

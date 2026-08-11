const express = require('express');
const prisma = require('../config/prisma');

const router = express.Router();

// Public platform-wide counters used on the homepage
router.get('/', async (req, res) => {
  try {
    const [players, clubs, matches, tournaments] = await Promise.all([
      prisma.player.count(),
      prisma.club.count(),
      prisma.match.count({ where: { status: 'COMPLETED' } }),
      prisma.tournament.count({
        where: { status: { in: ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'DRAW_PENDING', 'IN_PROGRESS'] } },
      }),
    ]);

    res.json({ players, clubs, matches, tournaments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load platform stats' });
  }
});

module.exports = router;

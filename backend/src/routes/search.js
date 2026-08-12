const express = require('express');
const prisma = require('../config/prisma');

const router = express.Router();

// Global search across players, clubs, tournaments
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ players: [], clubs: [], tournaments: [] });

    const query = q.trim();

    const [players, clubs, tournaments] = await Promise.all([
      prisma.player.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          handicapIndex: true,
          avatarUrl: true,
          homeClub: { select: { name: true } },
        },
        take: 8,
      }),
      prisma.club.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
            { county: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          county: true,
          logoUrl: true,
        },
        take: 8,
      }),
      prisma.tournament.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          formatType: true,
          startDate: true,
        },
        take: 8,
      }),
    ]);

    res.json({ players, clubs, tournaments });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;

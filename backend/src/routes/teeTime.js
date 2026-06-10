const express = require('express');
const { param, body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Supported booking systems
const BOOKING_SYSTEMS = {
  BRS_GOLF: { name: 'BRS Golf', urlPattern: 'https://www.brsgolf.com/##SLUG##/teetimes' },
  CLUBV1: { name: 'ClubV1', urlPattern: 'https://www.clubv1.com/##SLUG##/book' },
  INTELLIGENT_GOLF: { name: 'Intelligent Golf', urlPattern: 'https://www.intelligentgolf.co.uk/##SLUG##' },
  HOW_DID_I_DO: { name: 'How Did I Do', urlPattern: 'https://www.howdidido.com/clubs/##SLUG##/teetimes' },
  CUSTOM: { name: 'Custom', urlPattern: null },
};

// Get booking link for a club
router.get('/club/:clubId',
  param('clubId').isUUID(),
  query('date').optional().isISO8601(),
  query('time').optional().isString(),
  validate,
  async (req, res) => {
    try {
      const club = await prisma.club.findUnique({
        where: { id: req.params.clubId },
        select: { id: true, name: true, slug: true, website: true },
      });
      if (!club) return res.status(404).json({ error: 'Club not found' });

      // Build booking links for all known systems
      const bookingLinks = Object.entries(BOOKING_SYSTEMS).map(([key, sys]) => {
        let url = sys.urlPattern ? sys.urlPattern.replace('##SLUG##', club.slug) : club.website;
        if (url && req.query.date) {
          const sep = url.includes('?') ? '&' : '?';
          url += `${sep}date=${req.query.date}`;
        }
        return { system: key, name: sys.name, url };
      }).filter(l => l.url);

      // Add club website as fallback
      if (club.website && !bookingLinks.find(l => l.url === club.website)) {
        bookingLinks.push({ system: 'WEBSITE', name: 'Club Website', url: club.website });
      }

      res.json({
        club: { id: club.id, name: club.name },
        bookingLinks,
        note: 'Links redirect to the club\'s own booking system. Tee time availability is managed by the club.',
      });
    } catch (err) {
      console.error('Tee time error:', err);
      res.status(500).json({ error: 'Failed to get booking links' });
    }
  }
);

// Get booking link for a specific match
router.get('/match/:matchId',
  authenticate,
  param('matchId').isUUID(),
  validate,
  async (req, res) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: req.params.matchId },
        include: {
          venueClub: { select: { id: true, name: true, slug: true, website: true } },
          playerA: { select: { firstName: true, lastName: true } },
          playerB: { select: { firstName: true, lastName: true } },
          tournament: { select: { name: true } },
        },
      });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (!match.venueClub) return res.status(400).json({ error: 'No venue set for this match' });

      const club = match.venueClub;
      const bookingLinks = Object.entries(BOOKING_SYSTEMS).map(([key, sys]) => {
        let url = sys.urlPattern ? sys.urlPattern.replace('##SLUG##', club.slug) : club.website;
        if (url && match.scheduledDate) {
          const dateStr = new Date(match.scheduledDate).toISOString().split('T')[0];
          const sep = url.includes('?') ? '&' : '?';
          url += `${sep}date=${dateStr}`;
        }
        return { system: key, name: sys.name, url };
      }).filter(l => l.url);

      if (club.website && !bookingLinks.find(l => l.url === club.website)) {
        bookingLinks.push({ system: 'WEBSITE', name: 'Club Website', url: club.website });
      }

      res.json({
        match: {
          id: match.id,
          scheduledDate: match.scheduledDate,
          playerA: match.playerA,
          playerB: match.playerB,
          tournament: match.tournament.name,
        },
        venue: { id: club.id, name: club.name },
        bookingLinks,
        note: 'Book your tee time directly with the club. Select a time that suits both players.',
      });
    } catch (err) {
      console.error('Match tee time error:', err);
      res.status(500).json({ error: 'Failed to get booking links' });
    }
  }
);

module.exports = router;

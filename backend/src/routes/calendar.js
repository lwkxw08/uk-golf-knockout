const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

// Helper: format date for iCal (YYYYMMDDTHHMMSSZ)
function toICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Generate .ics file for a single match
router.get('/match/:matchId', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.matchId },
      include: {
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
        tournament: { select: { name: true } },
        venueClub: { select: { name: true, address: true, city: true, postcode: true } },
      },
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const start = match.scheduledDate || match.createdAt;
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    const pA = match.playerA ? `${match.playerA.firstName} ${match.playerA.lastName}` : 'TBD';
    const pB = match.playerB ? `${match.playerB.firstName} ${match.playerB.lastName}` : 'TBD';
    const venue = match.venueClub;
    const location = venue ? [venue.name, venue.address, venue.city, venue.postcode].filter(Boolean).join(', ') : '';
    const weekLabel = match.gameWeek ? `Week ${match.gameWeek}` : `Round ${match.roundNumber}`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UK Golf Knockout//Match//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:match-${match.id}@ukgolfknockout.com`,
      `DTSTART:${toICalDate(start)}`,
      `DTEND:${toICalDate(end)}`,
      `SUMMARY:${match.tournament.name} - ${weekLabel}: ${pA} vs ${pB}`,
      `DESCRIPTION:${match.tournament.name}\\n${weekLabel}\\n${pA} vs ${pB}`,
      location ? `LOCATION:${location}` : '',
      'STATUS:CONFIRMED',
      `URL:${req.protocol}://${req.get('host')}/match/${match.id}/live`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Golf match tomorrow',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Golf match in 2 hours',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="match-${match.id.substring(0, 8)}.ics"`);
    res.send(ics);
  } catch (err) {
    console.error('Calendar match error:', err);
    res.status(500).json({ error: 'Failed to generate calendar file' });
  }
});

// Generate .ics file for all matches in a tournament
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.tournamentId },
    });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const matches = await prisma.match.findMany({
      where: { tournamentId: req.params.tournamentId },
      include: {
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
        venueClub: { select: { name: true, address: true, city: true, postcode: true } },
      },
      orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
    });

    const events = matches.map((match) => {
      const start = match.scheduledDate || match.createdAt;
      const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
      const pA = match.playerA ? `${match.playerA.firstName} ${match.playerA.lastName}` : 'TBD';
      const pB = match.playerB ? `${match.playerB.firstName} ${match.playerB.lastName}` : 'TBD';
      const venue = match.venueClub;
      const location = venue ? [venue.name, venue.address, venue.city, venue.postcode].filter(Boolean).join(', ') : '';
      const weekLabel = match.gameWeek ? `Week ${match.gameWeek}` : `Round ${match.roundNumber}`;

      return [
        'BEGIN:VEVENT',
        `UID:match-${match.id}@ukgolfknockout.com`,
        `DTSTART:${toICalDate(start)}`,
        `DTEND:${toICalDate(end)}`,
        `SUMMARY:${tournament.name} - ${weekLabel}: ${pA} vs ${pB}`,
        `DESCRIPTION:${tournament.name}\\n${weekLabel}\\n${pA} vs ${pB}`,
        location ? `LOCATION:${location}` : '',
        `STATUS:${match.status === 'COMPLETED' ? 'CANCELLED' : 'CONFIRMED'}`,
        'END:VEVENT',
      ].filter(Boolean).join('\r\n');
    });

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UK Golf Knockout//Tournament//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${tournament.name}`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tournament.slug}.ics"`);
    res.send(ics);
  } catch (err) {
    console.error('Calendar tournament error:', err);
    res.status(500).json({ error: 'Failed to generate calendar file' });
  }
});

// Generate .ics for a player's upcoming matches
router.get('/my-matches', authenticate, async (req, res) => {
  try {
    const player = await prisma.player.findUnique({ where: { userId: req.user.id } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ playerAId: player.id }, { playerBId: player.id }],
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: {
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
        tournament: { select: { name: true } },
        venueClub: { select: { name: true, address: true, city: true, postcode: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const events = matches.map((match) => {
      const start = match.scheduledDate || new Date();
      const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
      const opponent = match.playerAId === player.id ? match.playerB : match.playerA;
      const oppName = opponent ? `${opponent.firstName} ${opponent.lastName}` : 'TBD';
      const venue = match.venueClub;
      const location = venue ? [venue.name, venue.address, venue.city, venue.postcode].filter(Boolean).join(', ') : '';
      const weekLabel = match.gameWeek ? `Week ${match.gameWeek}` : `Round ${match.roundNumber}`;

      return [
        'BEGIN:VEVENT',
        `UID:match-${match.id}@ukgolfknockout.com`,
        `DTSTART:${toICalDate(start)}`,
        `DTEND:${toICalDate(end)}`,
        `SUMMARY:Golf: vs ${oppName} (${match.tournament.name})`,
        `DESCRIPTION:${match.tournament.name}\\n${weekLabel}\\nvs ${oppName}`,
        location ? `LOCATION:${location}` : '',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Golf match tomorrow',
        'END:VALARM',
        'END:VEVENT',
      ].filter(Boolean).join('\r\n');
    });

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UK Golf Knockout//MyMatches//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:My Golf Matches',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="my-golf-matches.ics"');
    res.send(ics);
  } catch (err) {
    console.error('Calendar my-matches error:', err);
    res.status(500).json({ error: 'Failed to generate calendar file' });
  }
});

// Google Calendar URL generator
router.get('/google/:matchId', async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.matchId },
      include: {
        playerA: { select: { firstName: true, lastName: true } },
        playerB: { select: { firstName: true, lastName: true } },
        tournament: { select: { name: true } },
        venueClub: { select: { name: true, address: true, city: true, postcode: true } },
      },
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const start = match.scheduledDate || match.createdAt;
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const pA = match.playerA ? `${match.playerA.firstName} ${match.playerA.lastName}` : 'TBD';
    const pB = match.playerB ? `${match.playerB.firstName} ${match.playerB.lastName}` : 'TBD';
    const venue = match.venueClub;
    const location = venue ? [venue.name, venue.address, venue.city, venue.postcode].filter(Boolean).join(', ') : '';
    const weekLabel = match.gameWeek ? `Week ${match.gameWeek}` : `Round ${match.roundNumber}`;

    const gcalStart = start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const gcalEnd = end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.set('action', 'TEMPLATE');
    googleUrl.searchParams.set('text', `${match.tournament.name} - ${weekLabel}: ${pA} vs ${pB}`);
    googleUrl.searchParams.set('dates', `${gcalStart}/${gcalEnd}`);
    googleUrl.searchParams.set('details', `${match.tournament.name}\n${weekLabel}\n${pA} vs ${pB}`);
    if (location) googleUrl.searchParams.set('location', location);

    res.json({ googleCalendarUrl: googleUrl.toString() });
  } catch (err) {
    console.error('Google calendar error:', err);
    res.status(500).json({ error: 'Failed to generate Google Calendar link' });
  }
});

module.exports = router;

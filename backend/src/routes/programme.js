const express = require('express');
const prisma = require('../config/prisma');

const router = express.Router();

// Generate tournament programme data (JSON for frontend PDF rendering)
router.get('/:tournamentId', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.tournamentId },
      include: {
        sponsors: {
          where: { isActive: true },
          select: { id: true, name: true, logoUrl: true, website: true, tier: true, adImageUrl: true, adText: true },
        },
        prizes: { orderBy: { position: 'asc' } },
        pricing: true,
      },
    });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    // Get all entries with player + club
    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId: tournament.id, status: { in: ['ACTIVE', 'LEAGUE_ACTIVE', 'LEAGUE_COMPLETED'] } },
      include: {
        player: {
          select: { firstName: true, lastName: true, handicapIndex: true },
        },
        club: {
          select: { name: true },
        },
      },
      orderBy: { player: { lastName: 'asc' } },
    });

    // Get matches for bracket/fixture display
    const matches = await prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: {
        playerA: { select: { firstName: true, lastName: true, handicapIndex: true } },
        playerB: { select: { firstName: true, lastName: true, handicapIndex: true } },
        venueClub: { select: { name: true } },
        result: { select: { resultText: true } },
      },
      orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
    });

    // Get clubs involved
    const clubIds = [...new Set(entries.map((e) => e.clubId).filter(Boolean))];
    const clubs = await prisma.club.findMany({
      where: { id: { in: clubIds } },
      select: {
        name: true, address: true, city: true, county: true, postcode: true,
        par: true, slopeRating: true, courseRating: true, website: true, phone: true,
      },
    });

    // Format for PDF
    const programme = {
      title: tournament.name,
      season: tournament.season,
      format: tournament.formatType.replace(/_/g, ' '),
      scoring: tournament.scoringSystem,
      description: tournament.description,
      rules: tournament.rulesText,
      dates: {
        registration: tournament.registrationDeadline,
        start: tournament.startDate,
        end: tournament.endDate,
      },
      entrants: entries.map((e) => ({
        name: `${e.player.firstName} ${e.player.lastName}`,
        club: e.club?.name || 'Independent',
        handicap: e.player.handicapIndex ? Number(e.player.handicapIndex) : null,
      })),
      totalEntrants: entries.length,
      fixtures: tournament.isKnockout
        ? formatKnockoutBracket(matches)
        : formatLeagueFixtures(matches),
      isKnockout: tournament.isKnockout,
      clubs: clubs.map((c) => ({
        name: c.name,
        address: [c.address, c.city, c.county, c.postcode].filter(Boolean).join(', '),
        par: c.par,
        slopeRating: c.slopeRating,
        courseRating: c.courseRating ? Number(c.courseRating) : null,
        website: c.website,
        phone: c.phone,
      })),
      sponsors: tournament.sponsors.map((s) => ({
        name: s.name,
        logoUrl: s.logoUrl,
        website: s.website,
        tier: s.tier,
        adText: s.adText,
      })),
      prizes: tournament.prizes.map((p) => ({
        position: p.position,
        description: p.description,
        valuePence: p.valuePence,
      })),
      generatedAt: new Date().toISOString(),
    };

    res.json(programme);
  } catch (err) {
    console.error('Programme error:', err);
    res.status(500).json({ error: 'Failed to generate programme' });
  }
});

function formatKnockoutBracket(matches) {
  const rounds = {};
  matches.forEach((m) => {
    const label = getRoundLabel(m.stage, m.roundNumber);
    if (!rounds[label]) rounds[label] = [];
    rounds[label].push({
      matchNumber: m.matchNumber,
      playerA: m.playerA ? `${m.playerA.firstName} ${m.playerA.lastName}` : 'TBD',
      playerB: m.playerB ? `${m.playerB.firstName} ${m.playerB.lastName}` : 'TBD',
      venue: m.venueClub?.name || '',
      result: m.result?.resultText || '',
      status: m.status,
      scheduledDate: m.scheduledDate,
    });
  });
  return rounds;
}

function formatLeagueFixtures(matches) {
  const weeks = {};
  matches.forEach((m) => {
    const week = m.gameWeek || m.roundNumber;
    const label = `Week ${week}`;
    if (!weeks[label]) weeks[label] = [];
    weeks[label].push({
      home: m.playerA ? `${m.playerA.firstName} ${m.playerA.lastName}` : 'TBD',
      away: m.playerB ? `${m.playerB.firstName} ${m.playerB.lastName}` : 'TBD',
      venue: m.venueClub?.name || '',
      result: m.result?.resultText || '',
      status: m.status,
      scheduledDate: m.scheduledDate,
    });
  });
  return weeks;
}

function getRoundLabel(stage, roundNumber) {
  const labels = { 1: 'Round 1', 2: 'Round 2', 3: 'Quarter-Finals', 4: 'Semi-Finals', 5: 'Final' };
  return labels[roundNumber] || `Round ${roundNumber}`;
}

module.exports = router;

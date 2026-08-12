const prisma = require('../config/prisma');
const { generateSingleWeekFixtures } = require('./leagueService');
const { sendLeagueFixtureNotification } = require('./emailService');

let ioInstance = null;
let intervalId = null;

function setIo(io) {
  ioInstance = io;
}

async function executeScheduledDraw(draw) {
  const { tournamentId, roundNumber: gameWeek } = draw;
  console.log(`[DrawScheduler] Auto-executing Week ${gameWeek} draw for tournament ${tournamentId}`);

  try {
    // Mark as IN_PROGRESS
    await prisma.draw.update({
      where: { id: draw.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    // Find the league stage
    const stage = await prisma.tournamentStage_.findFirst({
      where: { tournamentId, isLeague: true },
      include: { tournament: true },
    });
    if (!stage) {
      console.error(`[DrawScheduler] No league stage for tournament ${tournamentId}`);
      return;
    }

    // Check this week doesn't already have fixtures
    const existingWeekMatch = await prisma.match.findFirst({
      where: { tournamentId, stage: 'REGIONAL_LEAGUE', gameWeek },
    });
    if (existingWeekMatch) {
      console.log(`[DrawScheduler] Week ${gameWeek} already has fixtures, marking draw COMPLETED`);
      await prisma.draw.update({
        where: { id: draw.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return;
    }

    // Get entries
    const entries = await prisma.tournamentEntry.findMany({
      where: {
        tournamentId,
        status: { in: ['ACTIVE', 'LEAGUE_ACTIVE'] },
        stage: 'REGIONAL_LEAGUE',
      },
      include: {
        player: {
          include: { homeClub: { select: { id: true, name: true } }, user: { select: { email: true } } },
        },
      },
    });

    const players = entries.map(e => ({
      id: e.playerId,
      homeClubId: e.player.homeClubId || e.clubId,
      firstName: e.player.firstName,
      lastName: e.player.lastName,
      handicapIndex: e.player.handicapIndex,
      clubName: e.player.homeClub?.name,
    }));

    if (players.length < 7) {
      console.error(`[DrawScheduler] Not enough players (${players.length}) for tournament ${tournamentId}`);
      return;
    }

    const matchCount = stage.leagueMatchCount || 6;
    const homeCount = stage.homeMatchCount || 3;

    // Fetch existing matches
    const existingDbMatches = await prisma.match.findMany({
      where: { tournamentId, stage: 'REGIONAL_LEAGUE', gameWeek: { not: null } },
      select: { gameWeek: true, playerAId: true, playerBId: true, isHomeForPlayerA: true, matchNumber: true },
    });

    const existingMatches = existingDbMatches.map(m => ({
      gameWeek: m.gameWeek,
      playerAId: m.playerAId,
      playerBId: m.playerBId,
      isHomeForPlayerA: m.isHomeForPlayerA,
    }));

    const maxExistingMatchNum = existingDbMatches.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0);

    const io = ioInstance;

    // Emit draw starting
    if (io) {
      io.to(`draw-${tournamentId}`).emit('league-draw:starting', {
        tournamentId, playerCount: players.length, gameWeek,
      });
    }

    // Generate fixtures
    const weekFixtures = generateSingleWeekFixtures(players, gameWeek, matchCount, homeCount, existingMatches);

    // Emit week announcement
    if (io) {
      io.to(`draw-${tournamentId}`).emit('league-draw:week-announce', {
        gameWeek, totalWeeks: matchCount, matchCount: weekFixtures.length,
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Create matches
    let matchNumber = maxExistingMatchNum + 1;
    const createdMatches = [];

    for (const f of weekFixtures) {
      const playerA = players.find(p => p.id === f.playerAId);
      const playerB = players.find(p => p.id === f.playerBId);

      const match = await prisma.match.create({
        data: {
          tournamentId,
          stage: 'REGIONAL_LEAGUE',
          roundNumber: gameWeek,
          matchNumber: matchNumber++,
          playerAId: f.playerAId,
          playerBId: f.playerBId,
          venueClubId: f.venueClubId,
          gameWeek,
          isHomeForPlayerA: f.isHomeForPlayerA,
          status: 'SCHEDULED',
        },
      });
      createdMatches.push(match);

      if (io) {
        io.to(`draw-${tournamentId}`).emit('league-draw:fixture', {
          gameWeek,
          matchId: match.id,
          home: {
            id: playerA?.id,
            name: `${playerA?.firstName} ${playerA?.lastName}`,
            handicap: playerA?.handicapIndex,
            club: playerA?.clubName,
          },
          away: {
            id: playerB?.id,
            name: `${playerB?.firstName} ${playerB?.lastName}`,
            handicap: playerB?.handicapIndex,
            club: playerB?.clubName,
          },
          venue: playerA?.clubName,
        });
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    // Upsert league standings
    const stageId = stage.id;
    for (const p of players) {
      const entry = entries.find(e => e.playerId === p.id);
      await prisma.leagueStanding.upsert({
        where: { tournamentId_stageId_playerId: { tournamentId, stageId, playerId: p.id } },
        create: { tournamentId, stageId, playerId: p.id, clubId: entry?.clubId || p.homeClubId },
        update: {},
      });
    }

    // Mark draw COMPLETED
    await prisma.draw.update({
      where: { id: draw.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Emit draw complete
    if (io) {
      io.to(`draw-${tournamentId}`).emit('league-draw:week-complete', { gameWeek, totalWeeks: matchCount });
      io.to(`draw-${tournamentId}`).emit('league-draw:complete', {
        tournamentId, gameWeek, totalMatches: createdMatches.length,
      });
    }

    // Send fixture emails
    for (const m of createdMatches) {
      const pA = players.find(p => p.id === m.playerAId);
      const pB = players.find(p => p.id === m.playerBId);
      const entryA = entries.find(e => e.playerId === m.playerAId);
      const entryB = entries.find(e => e.playerId === m.playerBId);
      const emailA = entryA?.player?.user?.email;
      const emailB = entryB?.player?.user?.email;
      if (emailA) {
        sendLeagueFixtureNotification(
          emailA, `${pA.firstName} ${pA.lastName}`, stage.tournament.name,
          [{ gameWeek, opponent: `${pB.firstName} ${pB.lastName}`, isHome: true, venue: pA.clubName }],
        ).catch(err => console.error('Fixture email error:', err));
      }
      if (emailB) {
        sendLeagueFixtureNotification(
          emailB, `${pB.firstName} ${pB.lastName}`, stage.tournament.name,
          [{ gameWeek, opponent: `${pA.firstName} ${pA.lastName}`, isHome: false, venue: pA.clubName }],
        ).catch(err => console.error('Fixture email error:', err));
      }
    }

    console.log(`[DrawScheduler] Week ${gameWeek} draw completed — ${createdMatches.length} matches`);
  } catch (err) {
    console.error(`[DrawScheduler] Error executing draw for week ${gameWeek}:`, err);
    // Reset draw status on failure
    await prisma.draw.update({
      where: { id: draw.id },
      data: { status: 'SCHEDULED', startedAt: null },
    }).catch(() => {});
  }
}

async function checkScheduledDraws() {
  try {
    const now = new Date();
    const dueDraws = await prisma.draw.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    });

    for (const draw of dueDraws) {
      await executeScheduledDraw(draw);
    }
  } catch (err) {
    console.error('[DrawScheduler] Poll error:', err);
  }
}

function startDrawScheduler(io) {
  setIo(io);
  // Check every 30 seconds for scheduled draws that need to execute
  intervalId = setInterval(checkScheduledDraws, 30000);
  // Also run immediately on startup
  checkScheduledDraws();
  console.log('[DrawScheduler] Started — polling every 30s for scheduled draws');
}

function stopDrawScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[DrawScheduler] Stopped');
  }
}

module.exports = { startDrawScheduler, stopDrawScheduler, checkScheduledDraws };

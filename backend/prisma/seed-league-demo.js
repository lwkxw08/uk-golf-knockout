/**
 * Seeds a regional league demo:
 * - 4 clubs in Buckinghamshire region
 * - 20 players (5 per club) qualified from club championships
 * - 6 game weeks with fixtures (3 home, 3 away per player)
 * - 4 completed game weeks with results + standings
 * - 2 upcoming game weeks
 *
 * Run: DATABASE_URL="..." node prisma/seed-league-demo.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const {
  DEFAULT_LEAGUE_SCORING,
  calculateLeaguePoints,
  calculateHolesDifferential,
} = require('../src/services/leagueService');

const CLUBS = [
  { name: 'Buckinghamshire Golf Club', slug: 'buckinghamshire-gc', county: 'Buckinghamshire', slopeRating: 131, courseRating: 72.3, par: 72, postcode: 'UB9 5PG', city: 'Denham' },
  { name: 'Stoke Park Golf Club', slug: 'stoke-park-gc', county: 'Buckinghamshire', slopeRating: 128, courseRating: 71.8, par: 72, postcode: 'SL2 4PG', city: 'Stoke Poges' },
  { name: 'Denham Golf Club', slug: 'denham-gc', county: 'Buckinghamshire', slopeRating: 134, courseRating: 73.1, par: 72, postcode: 'UB9 5BG', city: 'Denham' },
  { name: 'Beaconsfield Golf Club', slug: 'beaconsfield-gc', county: 'Buckinghamshire', slopeRating: 126, courseRating: 71.2, par: 72, postcode: 'HP9 2UR', city: 'Beaconsfield' },
];

const LEAGUE_PLAYERS = [
  // Buckinghamshire GC
  { email: 'tommy.fleetwood@demo.com', firstName: 'Tommy', lastName: 'Fleetwood', handicap: 4.2, clubIdx: 0 },
  { email: 'matt.wallace@demo.com', firstName: 'Matt', lastName: 'Wallace', handicap: 6.8, clubIdx: 0 },
  { email: 'eddie.pepperell@demo.com', firstName: 'Eddie', lastName: 'Pepperell', handicap: 8.1, clubIdx: 0 },
  { email: 'danny.willett@demo.com', firstName: 'Danny', lastName: 'Willett', handicap: 3.5, clubIdx: 0 },
  { email: 'andrew.johnston@demo.com', firstName: 'Andrew', lastName: 'Johnston', handicap: 11.3, clubIdx: 0 },
  // Stoke Park GC
  { email: 'chris.wood@demo.com', firstName: 'Chris', lastName: 'Wood', handicap: 7.4, clubIdx: 1 },
  { email: 'ross.fisher@demo.com', firstName: 'Ross', lastName: 'Fisher', handicap: 9.2, clubIdx: 1 },
  { email: 'robert.macintyre@demo.com', firstName: 'Robert', lastName: 'MacIntyre', handicap: 5.6, clubIdx: 1 },
  { email: 'callum.shinkwin@demo.com', firstName: 'Callum', lastName: 'Shinkwin', handicap: 10.5, clubIdx: 1 },
  { email: 'jordan.smith@demo.com', firstName: 'Jordan', lastName: 'Smith', handicap: 7.9, clubIdx: 1 },
  // Denham GC
  { email: 'sam.horsfield@demo.com', firstName: 'Sam', lastName: 'Horsfield', handicap: 6.1, clubIdx: 2 },
  { email: 'aaron.rai@demo.com', firstName: 'Aaron', lastName: 'Rai', handicap: 8.8, clubIdx: 2 },
  { email: 'marcus.armitage@demo.com', firstName: 'Marcus', lastName: 'Armitage', handicap: 12.0, clubIdx: 2 },
  { email: 'dale.whitnell@demo.com', firstName: 'Dale', lastName: 'Whitnell', handicap: 9.7, clubIdx: 2 },
  { email: 'jack.senior@demo.com', firstName: 'Jack', lastName: 'Senior', handicap: 11.2, clubIdx: 2 },
  // Beaconsfield GC
  { email: 'laurie.canter@demo.com', firstName: 'Laurie', lastName: 'Canter', handicap: 5.0, clubIdx: 3 },
  { email: 'richard.bland@demo.com', firstName: 'Richard', lastName: 'Bland', handicap: 3.8, clubIdx: 3 },
  { email: 'oliver.wilson@demo.com', firstName: 'Oliver', lastName: 'Wilson', handicap: 7.6, clubIdx: 3 },
  { email: 'luke.donald@demo.com', firstName: 'Luke', lastName: 'Donald', handicap: 2.1, clubIdx: 3 },
  { email: 'paul.casey@demo.com', firstName: 'Paul', lastName: 'Casey', handicap: 4.5, clubIdx: 3 },
];

// Possible matchplay results with their margin values
const RESULTS = [
  { text: '1 up', margin: 1, remaining: 0 },
  { text: '2&1', margin: 2, remaining: 1 },
  { text: '3&2', margin: 3, remaining: 2 },
  { text: '3&1', margin: 3, remaining: 1 },
  { text: '4&3', margin: 4, remaining: 3 },
  { text: '4&2', margin: 4, remaining: 2 },
  { text: '5&4', margin: 5, remaining: 4 },
  { text: '5&3', margin: 5, remaining: 3 },
  { text: '6&5', margin: 6, remaining: 5 },
  { text: '2 up', margin: 2, remaining: 0 },
];

function pickResult() {
  // 10% chance of halved match
  if (Math.random() < 0.1) {
    return { text: 'All Square', margin: 0, remaining: 0, isHalved: true };
  }
  const r = RESULTS[Math.floor(Math.random() * RESULTS.length)];
  return { ...r, isHalved: false };
}

/**
 * Simple league fixture generator for seed data.
 * Creates 6 rounds of pairings ensuring no same-club matches and no repeat opponents.
 */
function generateSeedFixtures(players, clubs) {
  const n = players.length; // 20
  const fixtures = [];
  const opponents = {};
  const homePlayed = {};
  const awayPlayed = {};

  for (const p of players) {
    opponents[p.id] = new Set();
    homePlayed[p.id] = 0;
    awayPlayed[p.id] = 0;
  }

  for (let week = 1; week <= 6; week++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const paired = new Set();

    for (let i = 0; i < shuffled.length; i++) {
      const pA = shuffled[i];
      if (paired.has(pA.id)) continue;

      for (let j = i + 1; j < shuffled.length; j++) {
        const pB = shuffled[j];
        if (paired.has(pB.id)) continue;
        if (opponents[pA.id].has(pB.id)) continue;
        if (pA.clubId === pB.clubId) continue;

        // Determine home/away
        let home, away;
        if (homePlayed[pA.id] >= 3) { home = pB; away = pA; }
        else if (homePlayed[pB.id] >= 3) { home = pA; away = pB; }
        else if (awayPlayed[pA.id] >= 3) { home = pA; away = pB; }
        else if (awayPlayed[pB.id] >= 3) { home = pB; away = pA; }
        else if (homePlayed[pA.id] < homePlayed[pB.id]) { home = pA; away = pB; }
        else if (homePlayed[pB.id] < homePlayed[pA.id]) { home = pB; away = pA; }
        else { home = Math.random() < 0.5 ? pA : pB; away = home === pA ? pB : pA; }

        fixtures.push({
          gameWeek: week,
          homePlayer: home,
          awayPlayer: away,
          venueClubId: home.clubId,
        });

        opponents[pA.id].add(pB.id);
        opponents[pB.id].add(pA.id);
        homePlayed[home.id]++;
        awayPlayed[away.id]++;
        paired.add(pA.id);
        paired.add(pB.id);
        break;
      }
    }
  }
  return fixtures;
}

async function main() {
  console.log('Seeding league demo data...\n');
  const hash = await bcrypt.hash('Player123!', 12);

  // Get or create region
  let region = await prisma.region.findUnique({ where: { slug: 'south-east' } });
  if (!region) {
    region = await prisma.region.create({
      data: { name: 'South East', slug: 'south-east' },
    });
  }

  // Create clubs
  const clubRecords = [];
  for (const c of CLUBS) {
    const club = await prisma.club.upsert({
      where: { slug: c.slug },
      update: { slopeRating: c.slopeRating, courseRating: c.courseRating, par: c.par, postcode: c.postcode, city: c.city },
      create: {
        name: c.name,
        slug: c.slug,
        county: c.county,
        regionId: region.id,
        slopeRating: c.slopeRating,
        courseRating: c.courseRating,
        par: c.par,
        postcode: c.postcode,
        city: c.city,
        address: `${c.name} Grounds, ${c.city}`,
      },
    });
    clubRecords.push(club);
    console.log(`Club: ${club.name}`);
  }

  // Create players
  const playerRecords = [];
  for (const p of LEAGUE_PLAYERS) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: hash,
        role: 'PLAYER',
        isActive: true,
        emailVerified: true,
      },
    });

    const player = await prisma.player.upsert({
      where: { userId: user.id },
      update: { homeClubId: clubRecords[p.clubIdx].id },
      create: {
        userId: user.id,
        firstName: p.firstName,
        lastName: p.lastName,
        homeClubId: clubRecords[p.clubIdx].id,
        handicapIndex: p.handicap,
      },
    });
    playerRecords.push({ ...player, clubId: clubRecords[p.clubIdx].id, clubIdx: p.clubIdx });
  }
  console.log(`Created ${playerRecords.length} league players across ${CLUBS.length} clubs\n`);

  // Create league tournament
  const tournament = await prisma.tournament.upsert({
    where: { slug: '2027-bucks-regional-league' },
    update: {},
    create: {
      name: '2027 Buckinghamshire Regional League',
      slug: '2027-bucks-regional-league',
      season: '2027',
      description: 'Regional league stage — 20 qualifiers from 4 Buckinghamshire clubs compete over 6 matchplay rounds. Top 4 qualify for the National Final.',
      formatType: 'SINGLES_MATCHPLAY',
      scoringSystem: 'MATCHPLAY',
      status: 'IN_PROGRESS',
      handicapAllowancePct: 100,
      ageCategory: 'OPEN',
      genderCategory: 'MIXED',
      enableLeaderboard: true,
      startDate: new Date('2027-05-01'),
      endDate: new Date('2027-08-31'),
      leagueMatchCount: 6,
      leagueScoringConfig: DEFAULT_LEAGUE_SCORING,
    },
  });
  console.log(`Tournament: ${tournament.name}`);

  // Create league stage
  let leagueStage = await prisma.tournamentStage_.findFirst({
    where: { tournamentId: tournament.id, stage: 'REGIONAL_LEAGUE' },
  });
  if (!leagueStage) {
    leagueStage = await prisma.tournamentStage_.create({
      data: {
        tournamentId: tournament.id,
        stage: 'REGIONAL_LEAGUE',
        stageOrder: 2,
        name: 'Buckinghamshire Regional League',
        maxParticipants: 20,
        qualifyCount: 4,
        isLeague: true,
        leagueMatchCount: 6,
        homeMatchCount: 3,
        awayMatchCount: 3,
      },
    });
  }
  console.log(`League stage: ${leagueStage.name}`);

  // Create entries
  for (const p of playerRecords) {
    await prisma.tournamentEntry.upsert({
      where: { tournamentId_playerId: { tournamentId: tournament.id, playerId: p.id } },
      update: {},
      create: {
        tournamentId: tournament.id,
        playerId: p.id,
        clubId: p.clubId,
        stage: 'REGIONAL_LEAGUE',
        status: 'LEAGUE_ACTIVE',
        paymentStatus: 'COMPLETED',
        handicapAtEntry: p.handicapIndex,
      },
    });
  }

  // Clean up existing league matches
  await prisma.matchResult.deleteMany({
    where: { match: { tournamentId: tournament.id, stage: 'REGIONAL_LEAGUE' } },
  });
  await prisma.match.deleteMany({
    where: { tournamentId: tournament.id, stage: 'REGIONAL_LEAGUE' },
  });
  await prisma.leagueStanding.deleteMany({
    where: { tournamentId: tournament.id },
  });

  // Generate fixtures
  const fixtures = generateSeedFixtures(playerRecords, clubRecords);
  console.log(`Generated ${fixtures.length} fixtures across 6 game weeks\n`);

  // Create matches and results (4 weeks completed, 2 upcoming)
  let matchNumber = 1;
  const allMatches = [];

  for (const f of fixtures) {
    const isCompleted = f.gameWeek <= 4;
    const result = isCompleted ? pickResult() : null;

    const winnerId = result
      ? (result.isHalved ? null : (Math.random() < 0.55 ? f.homePlayer.id : f.awayPlayer.id))
      : null;

    const scheduledDate = new Date('2027-05-01');
    scheduledDate.setDate(scheduledDate.getDate() + (f.gameWeek - 1) * 14);

    const matchData = {
      tournamentId: tournament.id,
      stage: 'REGIONAL_LEAGUE',
      roundNumber: f.gameWeek,
      matchNumber: matchNumber++,
      playerAId: f.homePlayer.id,
      playerBId: f.awayPlayer.id,
      venueClubId: f.venueClubId,
      gameWeek: f.gameWeek,
      isHomeForPlayerA: true,
      status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
      scheduledDate,
    };

    if (isCompleted && result) {
      matchData.winnerId = winnerId;
      matchData.holesUpMargin = result.margin;
      matchData.holesRemainingMargin = result.remaining;
      matchData.playedAt = scheduledDate;

      // Calculate league points
      const pts = calculateLeaguePoints({
        winnerId,
        playerAId: f.homePlayer.id,
        playerBId: f.awayPlayer.id,
        isHomeForPlayerA: true,
        holesUpMargin: result.margin,
        holesRemainingMargin: result.remaining,
      });
      matchData.leaguePointsA = pts.playerA.points;
      matchData.leaguePointsB = pts.playerB.points;
      matchData.leagueBonusDetailA = pts.playerA.detail;
      matchData.leagueBonusDetailB = pts.playerB.detail;
    }

    const match = await prisma.match.create({ data: matchData });

    if (isCompleted && result) {
      const submitter = Math.random() < 0.5 ? f.homePlayer : f.awayPlayer;
      const confirmer = submitter.id === f.homePlayer.id ? f.awayPlayer : f.homePlayer;

      await prisma.matchResult.create({
        data: {
          matchId: match.id,
          resultText: winnerId
            ? `${winnerId === f.homePlayer.id ? f.homePlayer.firstName : f.awayPlayer.firstName} ${winnerId === f.homePlayer.id ? f.homePlayer.lastName : f.awayPlayer.lastName} won ${result.text}`
            : `Match halved`,
          submittedById: submitter.id,
          confirmedById: confirmer.id,
          confirmedAt: scheduledDate,
          isConfirmed: true,
        },
      });
    }

    allMatches.push({ ...match, homePlayer: f.homePlayer, awayPlayer: f.awayPlayer });
  }

  // Create league standings
  const standingsData = {};
  for (const p of playerRecords) {
    standingsData[p.id] = {
      tournamentId: tournament.id,
      stageId: leagueStage.id,
      playerId: p.id,
      clubId: p.clubId,
      played: 0, wins: 0, draws: 0, losses: 0,
      leaguePoints: 0, bonusPoints: 0, totalPoints: 0,
      holesWon: 0, holesLost: 0, holesDifferential: 0,
      awayWins: 0, homeWins: 0, matchesReached18: 0,
    };
  }

  // Calculate from completed matches
  for (const m of allMatches) {
    if (m.status !== 'COMPLETED') continue;
    const sA = standingsData[m.playerAId];
    const sB = standingsData[m.playerBId];
    if (!sA || !sB) continue;

    sA.played++;
    sB.played++;

    const margin = m.holesUpMargin || 0;
    const remaining = m.holesRemainingMargin || 0;
    const isHalved = !m.winnerId;

    if (isHalved) {
      sA.draws++;
      sB.draws++;
    } else if (m.winnerId === m.playerAId) {
      sA.wins++;
      sB.losses++;
      sA.homeWins++;
    } else {
      sB.wins++;
      sA.losses++;
      sB.awayWins++;
    }

    sA.totalPoints += m.leaguePointsA || 0;
    sB.totalPoints += m.leaguePointsB || 0;

    // Track bonus points from match detail
    const ptsA = m.leaguePointsA || 0;
    const ptsB = m.leaguePointsB || 0;
    const baseA = isHalved ? 5 : (m.winnerId === m.playerAId ? 10 : 0);
    const baseB = isHalved ? 5 : (m.winnerId === m.playerBId ? 10 : 0);
    sA.bonusPoints += (ptsA - baseA);
    sB.bonusPoints += (ptsB - baseB);
    sA.leaguePoints += baseA;
    sB.leaguePoints += baseB;

    if (m.winnerId === m.playerAId) {
      sA.holesWon += margin;
      sB.holesLost += margin;
    } else if (m.winnerId === m.playerBId) {
      sB.holesWon += margin;
      sA.holesLost += margin;
    }
    sA.holesDifferential = sA.holesWon - sA.holesLost;
    sB.holesDifferential = sB.holesWon - sB.holesLost;

    const reached18 = remaining === 0 && (isHalved || margin === 1);
    if (reached18) {
      sA.matchesReached18++;
      sB.matchesReached18++;
    }
  }

  // Sort and assign positions
  const sorted = Object.values(standingsData).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.awayWins !== a.awayWins) return b.awayWins - a.awayWins;
    if (b.holesDifferential !== a.holesDifferential) return b.holesDifferential - a.holesDifferential;
    return a.holesLost - b.holesLost;
  });

  for (let i = 0; i < sorted.length; i++) {
    sorted[i].position = i + 1;
    sorted[i].qualified = i < 4; // Top 4 qualify
  }

  // Persist standings
  for (const s of sorted) {
    await prisma.leagueStanding.create({ data: s });
  }

  // Print standings table
  console.log('=== BUCKINGHAMSHIRE REGIONAL LEAGUE TABLE (after 4 of 6 game weeks) ===\n');
  console.log('Pos  Player                     Club              P  W  D  L  Pts  +/-   Away W');
  console.log('───  ─────────────────────────  ────────────────  ─  ─  ─  ─  ───  ───  ──────');
  for (const s of sorted) {
    const p = playerRecords.find(pr => pr.id === s.playerId);
    const club = CLUBS[LEAGUE_PLAYERS.find(lp => lp.email === p?.user?.email || true)?.clubIdx || 0];
    const pName = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
    const clubName = clubRecords.find(c => c.id === s.clubId)?.name?.substring(0, 16) || '-';
    const pos = s.position.toString().padEnd(4);
    const name = pName.padEnd(27);
    const cn = clubName.padEnd(18);
    const diff = (s.holesDifferential >= 0 ? '+' : '') + s.holesDifferential;
    console.log(`${pos} ${name} ${cn} ${s.played}  ${s.wins}  ${s.draws}  ${s.losses}  ${String(s.totalPoints).padStart(3)}  ${diff.padStart(3)}  ${s.awayWins}`);
  }

  // Create club season points
  const clubPts = {};
  for (const s of sorted) {
    if (!clubPts[s.clubId]) {
      clubPts[s.clubId] = {
        season: '2027',
        clubId: s.clubId,
        regionId: region.id,
        totalPoints: 0,
        playerCount: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        leagueQualifiers: 0,
      };
    }
    const cp = clubPts[s.clubId];
    cp.playerCount++;
    cp.totalPoints += s.totalPoints;
    cp.matchesPlayed += s.played;
    cp.matchesWon += s.wins;
    if (s.qualified) cp.leagueQualifiers++;
  }

  // Clean and recreate
  await prisma.clubSeasonPoints.deleteMany({ where: { season: '2027' } });
  const clubPtsSorted = Object.values(clubPts).sort((a, b) => b.totalPoints - a.totalPoints);
  for (let i = 0; i < clubPtsSorted.length; i++) {
    await prisma.clubSeasonPoints.create({
      data: { ...clubPtsSorted[i], position: i + 1 },
    });
  }

  console.log('\n=== CLUB POINTS CHAMPIONSHIP ===\n');
  for (const cp of clubPtsSorted) {
    const club = clubRecords.find(c => c.id === cp.clubId);
    console.log(`${cp.position}. ${club?.name} — ${cp.totalPoints} pts (${cp.playerCount} players, ${cp.matchesWon} wins)`);
  }

  console.log('\nLeague demo seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

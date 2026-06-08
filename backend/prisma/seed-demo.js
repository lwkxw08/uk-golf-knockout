/**
 * Seeds a demo tournament with 16 players, 4 rounds of bracket,
 * completed matches with hole-by-hole scores through to semi-finals.
 * Run: node prisma/seed-demo.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Realistic hole data for a Par 72 course
const HOLES = [
  { holeNumber: 1,  par: 4, yards: 398, strokeIndex: 7 },
  { holeNumber: 2,  par: 4, yards: 432, strokeIndex: 3 },
  { holeNumber: 3,  par: 3, yards: 182, strokeIndex: 15 },
  { holeNumber: 4,  par: 5, yards: 534, strokeIndex: 11 },
  { holeNumber: 5,  par: 4, yards: 410, strokeIndex: 1 },
  { holeNumber: 6,  par: 4, yards: 375, strokeIndex: 13 },
  { holeNumber: 7,  par: 3, yards: 196, strokeIndex: 17 },
  { holeNumber: 8,  par: 5, yards: 548, strokeIndex: 9 },
  { holeNumber: 9,  par: 4, yards: 445, strokeIndex: 5 },
  { holeNumber: 10, par: 4, yards: 420, strokeIndex: 8 },
  { holeNumber: 11, par: 3, yards: 175, strokeIndex: 16 },
  { holeNumber: 12, par: 5, yards: 510, strokeIndex: 10 },
  { holeNumber: 13, par: 4, yards: 385, strokeIndex: 4 },
  { holeNumber: 14, par: 4, yards: 440, strokeIndex: 2 },
  { holeNumber: 15, par: 4, yards: 390, strokeIndex: 12 },
  { holeNumber: 16, par: 3, yards: 205, strokeIndex: 18 },
  { holeNumber: 17, par: 4, yards: 425, strokeIndex: 6 },
  { holeNumber: 18, par: 5, yards: 555, strokeIndex: 14 },
];

// Generate realistic scores around par +/- a range based on handicap
function generateScores(handicapIndex) {
  return HOLES.map(h => {
    // Higher handicap = more variation and higher average
    const baseOffset = handicapIndex / 18;
    const variance = Math.random() * 3 - 1; // -1 to +2
    let score = h.par + Math.round(baseOffset + variance);
    if (score < 1) score = 1;
    if (score > h.par + 4) score = h.par + 4;
    return { holeNumber: h.holeNumber, score };
  });
}

const DEMO_PLAYERS = [
  { email: 'tommy.fleetwood@demo.com', firstName: 'Tommy', lastName: 'Fleetwood', handicap: 4.2 },
  { email: 'matt.wallace@demo.com', firstName: 'Matt', lastName: 'Wallace', handicap: 6.8 },
  { email: 'eddie.pepperell@demo.com', firstName: 'Eddie', lastName: 'Pepperell', handicap: 8.1 },
  { email: 'danny.willett@demo.com', firstName: 'Danny', lastName: 'Willett', handicap: 3.5 },
  { email: 'andrew.johnston@demo.com', firstName: 'Andrew', lastName: 'Johnston', handicap: 11.3 },
  { email: 'chris.wood@demo.com', firstName: 'Chris', lastName: 'Wood', handicap: 7.4 },
  { email: 'ross.fisher@demo.com', firstName: 'Ross', lastName: 'Fisher', handicap: 9.2 },
  { email: 'robert.macintyre@demo.com', firstName: 'Robert', lastName: 'MacIntyre', handicap: 5.6 },
  { email: 'callum.shinkwin@demo.com', firstName: 'Callum', lastName: 'Shinkwin', handicap: 10.5 },
  { email: 'jordan.smith@demo.com', firstName: 'Jordan', lastName: 'Smith', handicap: 7.9 },
  { email: 'sam.horsfield@demo.com', firstName: 'Sam', lastName: 'Horsfield', handicap: 6.1 },
  { email: 'aaron.rai@demo.com', firstName: 'Aaron', lastName: 'Rai', handicap: 8.8 },
  { email: 'marcus.armitage@demo.com', firstName: 'Marcus', lastName: 'Armitage', handicap: 12.0 },
  { email: 'dale.whitnell@demo.com', firstName: 'Dale', lastName: 'Whitnell', handicap: 9.7 },
  { email: 'jack.senior@demo.com', firstName: 'Jack', lastName: 'Senior', handicap: 11.2 },
  { email: 'laurie.canter@demo.com', firstName: 'Laurie', lastName: 'Canter', handicap: 5.0 },
];

async function main() {
  console.log('Seeding demo tournament...\n');
  const hash = await bcrypt.hash('Player123!', 12);

  // Get or create venue club with tee data
  let club = await prisma.club.findUnique({ where: { slug: 'buckinghamshire-gc' } });
  if (!club) {
    const region = await prisma.region.findUnique({ where: { slug: 'south-east' } });
    club = await prisma.club.create({
      data: {
        name: 'Buckinghamshire Golf Club',
        slug: 'buckinghamshire-gc',
        county: 'Buckinghamshire',
        regionId: region?.id,
        slopeRating: 131,
        courseRating: 72.3,
        par: 72,
      },
    });
  }

  // Ensure club has a tee with holes
  let clubTee = await prisma.clubTee.findFirst({ where: { clubId: club.id } });
  if (!clubTee) {
    clubTee = await prisma.clubTee.create({
      data: {
        clubId: club.id,
        teeName: 'White',
        gender: 'male',
        slopeRating: 131,
        courseRating: 72.3,
        par: 72,
        totalYards: 6625,
        numberOfHoles: 18,
        holes: {
          create: HOLES.map(h => ({
            holeNumber: h.holeNumber,
            par: h.par,
            yards: h.yards,
            strokeIndex: h.strokeIndex,
          })),
        },
      },
    });
    console.log('Created club tee with 18 holes');
  }

  // Create 16 demo players
  const playerRecords = [];
  for (const p of DEMO_PLAYERS) {
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
      update: {},
      create: {
        userId: user.id,
        firstName: p.firstName,
        lastName: p.lastName,
        homeClubId: club.id,
        handicapIndex: p.handicap,
      },
    });
    playerRecords.push(player);
  }
  console.log(`Created ${playerRecords.length} demo players`);

  // Create tournament
  const tournament = await prisma.tournament.upsert({
    where: { slug: '2027-club-knockout-demo' },
    update: {},
    create: {
      name: '2027 Buckinghamshire Club Knockout',
      slug: '2027-club-knockout-demo',
      season: '2027',
      description: 'Club-level matchplay knockout championship with 16 entries. Handicap-adjusted matchplay format with 90% handicap allowance.',
      formatType: 'SINGLES_MATCHPLAY',
      scoringSystem: 'MATCHPLAY',
      status: 'IN_PROGRESS',
      handicapAllowancePct: 90,
      maxHandicap: 28.0,
      ageCategory: 'OPEN',
      genderCategory: 'MIXED',
      enableLeaderboard: true,
      startDate: new Date('2027-04-01'),
      endDate: new Date('2027-09-30'),
    },
  });
  console.log(`Tournament: ${tournament.name}`);

  // Link tournament to a tee
  await prisma.tournamentTee.upsert({
    where: { tournamentId_clubTeeId: { tournamentId: tournament.id, clubTeeId: clubTee.id } },
    update: {},
    create: {
      tournamentId: tournament.id,
      clubTeeId: clubTee.id,
    },
  });

  // Create tournament entry for all 16 players
  for (const p of playerRecords) {
    await prisma.tournamentEntry.upsert({
      where: { tournamentId_playerId: { tournamentId: tournament.id, playerId: p.id } },
      update: {},
      create: {
        tournamentId: tournament.id,
        playerId: p.id,
        clubId: club.id,
        status: 'ACTIVE',
        paymentStatus: 'COMPLETED',
        handicapAtEntry: p.handicapIndex,
      },
    });
  }
  console.log('All 16 players entered');

  // Create stage
  const stage = await prisma.tournamentStage_.create({
    data: {
      tournamentId: tournament.id,
      stage: 'CLUB_QUALIFIER',
      stageOrder: 1,
      name: 'Club Knockout',
      maxParticipants: 16,
      totalRounds: 4,
      qualifyCount: 1,
    },
  }).catch(async () => {
    // If stage exists, find it
    return prisma.tournamentStage_.findFirst({
      where: { tournamentId: tournament.id, stage: 'CLUB_QUALIFIER' },
    });
  });

  // Clean up existing matches for this tournament before recreating
  await prisma.matchHoleScore.deleteMany({
    where: { match: { tournamentId: tournament.id } },
  });
  await prisma.matchResult.deleteMany({
    where: { match: { tournamentId: tournament.id } },
  });
  await prisma.match.deleteMany({
    where: { tournamentId: tournament.id },
  });

  // ────────────────────────────────────────────────────────────────────────
  // CREATE BRACKET: 16 players → R1(8 matches) → QF(4) → SF(2) → Final(1)
  // ────────────────────────────────────────────────────────────────────────

  // Create Final first (round 4)
  const final = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      stage: 'CLUB_QUALIFIER',
      roundNumber: 4,
      matchNumber: 1,
      status: 'PENDING',
      venueClubId: club.id,
    },
  });

  // Create semi-finals (round 3)
  const sf1 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      stage: 'CLUB_QUALIFIER',
      roundNumber: 3,
      matchNumber: 1,
      status: 'PENDING',
      venueClubId: club.id,
      nextMatchId: final.id,
    },
  });
  const sf2 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      stage: 'CLUB_QUALIFIER',
      roundNumber: 3,
      matchNumber: 2,
      status: 'PENDING',
      venueClubId: club.id,
      nextMatchId: final.id,
    },
  });

  // Create quarter-finals (round 2)
  const qfMatches = [];
  for (let i = 0; i < 4; i++) {
    const qf = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        stage: 'CLUB_QUALIFIER',
        roundNumber: 2,
        matchNumber: i + 1,
        status: 'PENDING',
        venueClubId: club.id,
        nextMatchId: i < 2 ? sf1.id : sf2.id,
      },
    });
    qfMatches.push(qf);
  }

  // Create Round 1 (8 matches, 16 players)
  const r1Matches = [];
  for (let i = 0; i < 8; i++) {
    const r1 = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        stage: 'CLUB_QUALIFIER',
        roundNumber: 1,
        matchNumber: i + 1,
        playerAId: playerRecords[i * 2].id,
        playerBId: playerRecords[i * 2 + 1].id,
        venueClubId: club.id,
        nextMatchId: qfMatches[Math.floor(i / 2)].id,
        status: 'COMPLETED',
        playedAt: new Date(`2027-04-${(i + 5).toString().padStart(2, '0')}`),
      },
    });
    r1Matches.push(r1);
  }

  console.log('Created bracket: 8 R1 → 4 QF → 2 SF → 1 Final');

  // ────────────────────────────────────────────────────────────────────────
  // Seed Round 1 results with hole-by-hole scores
  // ────────────────────────────────────────────────────────────────────────
  const r1Winners = []; // indices 0,3,4,6,9,10,12,15 — alternating picks
  const r1ResultTexts = ['3&2', '2&1', '1 up', '4&3', '2 up', '3&1', '1 up', '5&4'];

  for (let i = 0; i < 8; i++) {
    const match = r1Matches[i];
    const playerA = playerRecords[i * 2];
    const playerB = playerRecords[i * 2 + 1];
    const winnerIsA = i % 2 === 0; // alternating winners
    const winner = winnerIsA ? playerA : playerB;
    r1Winners.push(winner);

    // Generate scores
    const scoresA = generateScores(Number(playerA.handicapIndex));
    const scoresB = generateScores(Number(playerB.handicapIndex));

    // Save hole scores for both players
    await prisma.matchHoleScore.createMany({
      data: [
        ...scoresA.map(s => ({ matchId: match.id, playerId: playerA.id, holeNumber: s.holeNumber, score: s.score })),
        ...scoresB.map(s => ({ matchId: match.id, playerId: playerB.id, holeNumber: s.holeNumber, score: s.score })),
      ],
    });

    const grossA = scoresA.reduce((s, h) => s + h.score, 0);
    const grossB = scoresB.reduce((s, h) => s + h.score, 0);

    // Create match result
    await prisma.matchResult.create({
      data: {
        matchId: match.id,
        resultText: r1ResultTexts[i],
        grossScore: winnerIsA ? grossA : grossB,
        submittedById: winner.id,
        isConfirmed: true,
        confirmedById: winnerIsA ? playerB.id : playerA.id,
        confirmedAt: new Date(`2027-04-${(i + 5).toString().padStart(2, '0')}`),
      },
    });

    // Set winner
    await prisma.match.update({
      where: { id: match.id },
      data: { winnerId: winner.id },
    });

    // Advance winner to QF
    const qfMatch = qfMatches[Math.floor(i / 2)];
    const slot = i % 2 === 0 ? 'playerAId' : 'playerBId';
    await prisma.match.update({
      where: { id: qfMatch.id },
      data: { [slot]: winner.id },
    });
  }

  console.log('Round 1 complete — 8 matches with full scorecards');

  // ────────────────────────────────────────────────────────────────────────
  // Seed QF results (4 matches, winners advance to SF)
  // ────────────────────────────────────────────────────────────────────────
  const qfWinners = [];
  const qfResultTexts = ['2&1', '1 up', '3&2', '4&3'];

  for (let i = 0; i < 4; i++) {
    const qf = await prisma.match.findUnique({
      where: { id: qfMatches[i].id },
      include: { playerA: true, playerB: true },
    });

    const winnerIsA = i % 2 === 0;
    const winner = winnerIsA ? qf.playerA : qf.playerB;
    const loser = winnerIsA ? qf.playerB : qf.playerA;
    qfWinners.push(winner);

    const scoresA = generateScores(Number(qf.playerA.handicapIndex));
    const scoresB = generateScores(Number(qf.playerB.handicapIndex));

    await prisma.matchHoleScore.createMany({
      data: [
        ...scoresA.map(s => ({ matchId: qf.id, playerId: qf.playerAId, holeNumber: s.holeNumber, score: s.score })),
        ...scoresB.map(s => ({ matchId: qf.id, playerId: qf.playerBId, holeNumber: s.holeNumber, score: s.score })),
      ],
    });

    const grossA = scoresA.reduce((s, h) => s + h.score, 0);

    await prisma.matchResult.create({
      data: {
        matchId: qf.id,
        resultText: qfResultTexts[i],
        grossScore: grossA,
        submittedById: winner.id,
        isConfirmed: true,
        confirmedById: loser.id,
        confirmedAt: new Date(`2027-05-${(i * 3 + 10).toString().padStart(2, '0')}`),
      },
    });

    await prisma.match.update({
      where: { id: qf.id },
      data: {
        status: 'COMPLETED',
        winnerId: winner.id,
        playedAt: new Date(`2027-05-${(i * 3 + 10).toString().padStart(2, '0')}`),
      },
    });

    // Advance to SF
    const sfMatch = i < 2 ? sf1 : sf2;
    const sfSlot = i % 2 === 0 ? 'playerAId' : 'playerBId';
    await prisma.match.update({
      where: { id: sfMatch.id },
      data: { [sfSlot]: winner.id },
    });
  }

  console.log('Quarter-finals complete — 4 matches with full scorecards');

  // ────────────────────────────────────────────────────────────────────────
  // SF and Final left as PENDING/SCHEDULED for live viewing
  // ────────────────────────────────────────────────────────────────────────
  // Set SF matches as SCHEDULED with upcoming dates
  await prisma.match.update({
    where: { id: sf1.id },
    data: {
      status: 'SCHEDULED',
      scheduledDate: new Date('2027-06-14T10:00:00Z'),
    },
  });
  await prisma.match.update({
    where: { id: sf2.id },
    data: {
      status: 'SCHEDULED',
      scheduledDate: new Date('2027-06-14T14:00:00Z'),
    },
  });

  console.log('Semi-finals scheduled for 14th June 2027');
  console.log('Final pending — awaiting semi-final winners');

  // ────────────────────────────────────────────────────────────────────────
  // Summary
  // ────────────────────────────────────────────────────────────────────────
  console.log('\n=== Demo Tournament Ready ===');
  console.log(`Tournament: ${tournament.name} (slug: ${tournament.slug})`);
  console.log('16 players, 15 bracket matches');
  console.log('R1: 8 matches COMPLETED with 18-hole scorecards');
  console.log('QF: 4 matches COMPLETED with 18-hole scorecards');
  console.log('SF: 2 matches SCHEDULED (players seeded from QF winners)');
  console.log('Final: 1 match PENDING (awaiting SF winners)');
  console.log('\nSF players:');
  console.log(`  SF1: ${qfWinners[0].firstName} ${qfWinners[0].lastName} vs ${qfWinners[1].firstName} ${qfWinners[1].lastName}`);
  console.log(`  SF2: ${qfWinners[2].firstName} ${qfWinners[2].lastName} vs ${qfWinners[3].firstName} ${qfWinners[3].lastName}`);
  console.log(`\nLogin as any demo player with password: Player123!`);
  console.log('Demo player emails: tommy.fleetwood@demo.com, matt.wallace@demo.com, etc.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ukgolfknockout.com' },
    update: {},
    create: {
      email: 'admin@ukgolfknockout.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log('Admin user created:', admin.email);

  // Create regions
  const regions = [
    { name: 'South East', slug: 'south-east' },
    { name: 'South West', slug: 'south-west' },
    { name: 'Midlands', slug: 'midlands' },
    { name: 'North West', slug: 'north-west' },
    { name: 'North East', slug: 'north-east' },
    { name: 'East Anglia', slug: 'east-anglia' },
    { name: 'Scotland', slug: 'scotland' },
    { name: 'Wales', slug: 'wales' },
  ];

  for (const r of regions) {
    await prisma.region.upsert({
      where: { slug: r.slug },
      update: {},
      create: r,
    });
  }
  console.log('Regions created:', regions.length);

  // Create sample clubs
  const seRegion = await prisma.region.findUnique({ where: { slug: 'south-east' } });
  const midRegion = await prisma.region.findUnique({ where: { slug: 'midlands' } });

  const clubs = [
    { name: 'Buckinghamshire Golf Club', slug: 'buckinghamshire-gc', county: 'Buckinghamshire', regionId: seRegion.id },
    { name: 'Wentworth Club', slug: 'wentworth-club', county: 'Surrey', regionId: seRegion.id },
    { name: 'Sunningdale Golf Club', slug: 'sunningdale-gc', county: 'Berkshire', regionId: seRegion.id },
    { name: 'The Belfry', slug: 'the-belfry', county: 'Warwickshire', regionId: midRegion.id },
    { name: 'Little Aston Golf Club', slug: 'little-aston-gc', county: 'West Midlands', regionId: midRegion.id },
  ];

  for (const c of clubs) {
    await prisma.club.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  console.log('Clubs created:', clubs.length);

  // Create sample players
  const playerHash = await bcrypt.hash('Player123!', 12);
  const buckClub = await prisma.club.findUnique({ where: { slug: 'buckinghamshire-gc' } });

  const players = [
    { email: 'john.smith@example.com', firstName: 'John', lastName: 'Smith', handicap: 12.4 },
    { email: 'james.wilson@example.com', firstName: 'James', lastName: 'Wilson', handicap: 8.2 },
    { email: 'sarah.jones@example.com', firstName: 'Sarah', lastName: 'Jones', handicap: 15.7 },
    { email: 'mike.brown@example.com', firstName: 'Mike', lastName: 'Brown', handicap: 5.1 },
  ];

  for (const p of players) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: playerHash,
        role: 'PLAYER',
        isActive: true,
        emailVerified: true,
      },
    });

    await prisma.player.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firstName: p.firstName,
        lastName: p.lastName,
        homeClubId: buckClub.id,
        handicapIndex: p.handicap,
      },
    });
  }
  console.log('Players created:', players.length);

  // Create a sample tournament
  const tournament = await prisma.tournament.upsert({
    where: { slug: '2027-uk-amateur-matchplay' },
    update: {},
    create: {
      name: '2027 UK Amateur Matchplay Championship',
      slug: '2027-uk-amateur-matchplay',
      season: '2027',
      description: 'The inaugural UK Amateur Matchplay Championship. Open to all amateur golfers with a valid WHS handicap.',
      formatType: 'SINGLES_MATCHPLAY',
      scoringSystem: 'MATCHPLAY',
      status: 'REGISTRATION_OPEN',
      handicapAllowancePct: 90,
      maxHandicap: 28.0,
      ageCategory: 'OPEN',
      registrationDeadline: new Date('2027-03-31'),
      startDate: new Date('2027-04-01'),
      endDate: new Date('2027-09-30'),
    },
  });

  // Create tournament stages
  const stages = [
    { stage: 'CLUB_QUALIFIER', stageOrder: 1, name: 'Club Qualifier', totalRounds: 4 },
    { stage: 'REGIONAL', stageOrder: 2, name: 'Regional Championship', totalRounds: 3 },
    { stage: 'NATIONAL_FINAL', stageOrder: 3, name: 'National Final', totalRounds: 5 },
  ];

  for (const s of stages) {
    await prisma.tournamentStage_.upsert({
      where: { tournamentId_stage: { tournamentId: tournament.id, stage: s.stage } },
      update: {},
      create: { tournamentId: tournament.id, ...s },
    });
  }

  // Create tournament pricing
  await prisma.tournamentPricing.create({
    data: {
      tournamentId: tournament.id,
      feeType: 'ENTRY_FEE',
      amountPence: 2500,
      clubSharePct: 50,
      platformSharePct: 50,
      description: 'Standard entry fee',
    },
  }).catch(() => {}); // ignore if exists

  console.log('Tournament created:', tournament.name);

  // Create a seniors tournament
  const seniorsTournament = await prisma.tournament.upsert({
    where: { slug: '2027-uk-seniors-knockout' },
    update: {},
    create: {
      name: '2027 UK Seniors Knockout',
      slug: '2027-uk-seniors-knockout',
      season: '2027',
      description: 'Over 55s matchplay knockout championship.',
      formatType: 'SINGLES_MATCHPLAY',
      scoringSystem: 'MATCHPLAY',
      status: 'REGISTRATION_OPEN',
      handicapAllowancePct: 100,
      ageCategory: 'SENIOR',
      minAge: 55,
      registrationDeadline: new Date('2027-04-15'),
      startDate: new Date('2027-05-01'),
    },
  });

  await prisma.tournamentPricing.create({
    data: {
      tournamentId: seniorsTournament.id,
      feeType: 'ENTRY_FEE',
      amountPence: 2000,
      clubSharePct: 50,
      platformSharePct: 50,
      description: 'Seniors entry fee',
    },
  }).catch(() => {});

  console.log('Seniors tournament created:', seniorsTournament.name);

  // Platform pricing
  const platformPricing = [
    { pricingKey: 'player_annual_membership', amountPence: 3900, description: 'Annual player membership', effectiveFrom: new Date('2027-01-01') },
    { pricingKey: 'club_basic_licence', amountPence: 0, description: 'Club basic licence (free)', effectiveFrom: new Date('2027-01-01') },
    { pricingKey: 'club_premium_licence', amountPence: 29900, description: 'Club premium licence', effectiveFrom: new Date('2027-01-01') },
  ];

  for (const p of platformPricing) {
    await prisma.platformPricing.upsert({
      where: { pricingKey: p.pricingKey },
      update: {},
      create: p,
    });
  }
  console.log('Platform pricing created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

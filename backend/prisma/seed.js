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

  // Seed demo news articles
  const demoArticles = [
    {
      title: 'Luna Golf Platform Launch — Welcome to the Future of Knockout Golf',
      summary: 'We\'re thrilled to announce the official launch of the Luna Golf platform. Register now and find your first tournament.',
      content: 'After months of development and testing with our founding partner clubs, Luna Golf is officially live.\n\nThe platform brings everything you need for organised matchplay knockout competitions — from automated seeded draws to live scoring, league tables, and a thriving social community.\n\nKey features at launch:\n• Handicap-seeded knockout draws\n• Regional league format with points tables\n• Live hole-by-hole match tracking\n• Social feed and player profiles\n• Share a Round — find playing partners\n• Club marketplace for member offers\n• Full dark mode support\n• Mobile-first PWA (install on your home screen)\n\nRegister today and enter your first tournament. Welcome to Luna Golf.',
      category: 'Announcement',
      published: true,
      publishedAt: new Date('2026-06-01'),
      authorId: admin.id,
    },
    {
      title: '2027 Buckinghamshire Regional League — Entries Open',
      summary: 'The flagship regional league is now accepting entries. 20 players, round-robin format, top 4 qualify for the National Final.',
      content: 'Entries are now open for the 2027 Buckinghamshire Regional League — our flagship competition format.\n\nFormat:\n• 20 players from clubs across Buckinghamshire\n• Round-robin matchplay within your group\n• Points: 10 for a win, 5 for a draw, 2 for a loss, plus bonus points\n• Top 4 qualify for the National Final\n\nParticipating clubs include Stoke Park, Beaconsfield, Denham, and Burnham Beeches.\n\nEntry fee: £25 per player. All matches to be completed by October 2027.\n\nEnter through the Tournaments page — search for "Buckinghamshire Regional League".',
      category: 'Tournament Update',
      published: true,
      publishedAt: new Date('2026-06-03'),
      authorId: admin.id,
    },
    {
      title: 'New Feature: Share a Round — Never Play Alone Again',
      summary: 'Post your available tee times and find playing partners from the Luna Golf community. Fill your 4-ball in seconds.',
      content: 'We\'ve launched Share a Round — a simple way to find playing partners from the Luna Golf community.\n\nHow it works:\n1. Post your tee time (course, date, time, green fee, available spots)\n2. Other members see your post and express interest\n3. Accept a player to fill your group\n4. Play together, make new connections\n\nPerfect for:\n• Filling a 4-ball when someone drops out\n• Playing a new course with company\n• Meeting other competitive golfers in your area\n\nFind it in the navbar under "Share a Round" or browse open tee times from the homepage.',
      category: 'Feature Release',
      published: true,
      publishedAt: new Date('2026-06-05'),
      authorId: admin.id,
    },
    {
      title: 'Tips: How to Win Your First Knockout Match',
      summary: 'New to matchplay? Here are 5 practical tips to help you win your first Luna Golf knockout match.',
      content: 'Matchplay is a different beast to strokeplay. Here are 5 tips for your first knockout match:\n\n1. Play the player, not the course\nIn matchplay you only need to beat one person. If your opponent makes bogey, you don\'t need birdie — just make par.\n\n2. Never give up a hole\nEven 3 down with 4 to play is very recoverable in matchplay. Keep fighting every hole.\n\n3. Know your strokes\nCheck which holes you receive (or give) shots BEFORE the round. Strokes at the hard holes are a huge advantage.\n\n4. Concede short putts early\nBeing generous with gimmes early on builds goodwill and puts pressure on your opponent to do the same when it matters.\n\n5. Focus on your own game\nDon\'t watch your opponent too closely. Play your game, trust your swing, and let the scorecard do the talking.\n\nGood luck in your first match!',
      category: 'Tips & Advice',
      published: true,
      publishedAt: new Date('2026-06-07'),
      authorId: admin.id,
    },
  ];

  // Only seed if no articles exist
  const existingArticles = await prisma.newsArticle.count();
  if (existingArticles === 0) {
    for (const article of demoArticles) {
      await prisma.newsArticle.create({ data: article });
    }
    console.log('Demo news articles created');
  } else {
    console.log('News articles already exist, skipping');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

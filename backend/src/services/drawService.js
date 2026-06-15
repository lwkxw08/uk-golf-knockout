const prisma = require('../config/prisma');

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function totalRoundsForBracket(numPlayers) {
  return Math.ceil(Math.log2(numPlayers));
}

/**
 * Handicap-based seeding: places players so top seeds are distributed evenly.
 * Seed 1 vs last seed in first round, seed 2 vs second-last, etc.
 * Lower handicap = better seed (seed 1 = lowest handicap).
 */
function seedByHandicap(entries) {
  // Sort by handicap index (lower = better). Null handicaps go to end.
  const sorted = [...entries].sort((a, b) => {
    const hA = a.handicapIndex ?? 999;
    const hB = b.handicapIndex ?? 999;
    return hA - hB;
  });

  // Assign seed numbers
  sorted.forEach((entry, i) => { entry.seed = i + 1; });

  const n = sorted.length;
  const bracketSize = nextPowerOf2(n);

  // Standard seeding placement for knockout brackets
  // Positions are 0-indexed slots in round 1
  function getSeededPositions(size) {
    if (size === 1) return [0];
    const half = getSeededPositions(size / 2);
    return half.reduce((acc, pos) => {
      acc.push(pos);
      acc.push(size - 1 - pos);
      return acc;
    }, []);
  }

  const positions = getSeededPositions(bracketSize);
  const seeded = new Array(bracketSize).fill(null);

  for (let i = 0; i < sorted.length; i++) {
    seeded[positions[i]] = sorted[i];
  }

  return seeded;
}

async function generateKnockoutDraw(tournamentId, stage, entries, io, options = {}) {
  const { useSeeding = false } = options;

  let orderedEntries;
  if (useSeeding) {
    // Fetch handicap data for entries
    const playerIds = entries.map(e => e.playerId);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, handicapIndex: true },
    });
    const handicapMap = {};
    players.forEach(p => { handicapMap[p.id] = p.handicapIndex ? Number(p.handicapIndex) : null; });

    // Attach handicap to entries
    const entriesWithHandicap = entries.map(e => ({
      ...e,
      handicapIndex: handicapMap[e.playerId] ?? null,
    }));

    orderedEntries = seedByHandicap(entriesWithHandicap);
  } else {
    // Random shuffle (existing behavior)
    const shuffled = shuffle(entries);
    const bracketSize = nextPowerOf2(shuffled.length);
    orderedEntries = new Array(bracketSize).fill(null);
    shuffled.forEach((entry, i) => { orderedEntries[i] = entry; });
  }

  const bracketSize = orderedEntries.length;
  const numRounds = totalRoundsForBracket(bracketSize);

  const allMatches = [];

  // Create all bracket matches (empty shells) for the full bracket
  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
      allMatches.push({
        tournamentId,
        stage,
        roundNumber: round,
        matchNumber: matchNum,
        status: 'PENDING',
      });
    }
  }

  // Insert all matches
  const createdMatches = [];
  for (const m of allMatches) {
    const match = await prisma.match.create({ data: m });
    createdMatches.push(match);
  }

  // Index matches by round and number
  const matchMap = {};
  for (const m of createdMatches) {
    const key = `${m.roundNumber}-${m.matchNumber}`;
    matchMap[key] = m;
  }

  // Link matches: winner of round N match M feeds into round N+1 match ceil(M/2)
  for (let round = 1; round < numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
      const current = matchMap[`${round}-${matchNum}`];
      const nextMatchNum = Math.ceil(matchNum / 2);
      const nextMatch = matchMap[`${round + 1}-${nextMatchNum}`];
      if (nextMatch) {
        await prisma.match.update({
          where: { id: current.id },
          data: { nextMatchId: nextMatch.id },
        });
      }
    }
  }

  // Populate round 1 with players and emit live draw events
  const round1Matches = bracketSize / 2;
  let seedings = [];

  for (let matchNum = 1; matchNum <= round1Matches; matchNum++) {
    const match = matchMap[`1-${matchNum}`];
    const slotA = (matchNum - 1) * 2;
    const slotB = slotA + 1;
    const playerA = orderedEntries[slotA] || null;
    const playerB = orderedEntries[slotB] || null;

    const updateData = {};
    if (playerA) updateData.playerAId = playerA.playerId;
    if (playerB) updateData.playerBId = playerB.playerId;

    // If only one player (bye), auto-advance
    if (playerA && !playerB) {
      updateData.winnerId = playerA.playerId;
      updateData.status = 'COMPLETED';
    }

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: updateData,
      include: {
        playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
        playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
      },
    });

    if (useSeeding) {
      if (playerA) seedings.push({ playerId: playerA.playerId, seed: playerA.seed, handicap: playerA.handicapIndex });
      if (playerB) seedings.push({ playerId: playerB.playerId, seed: playerB.seed, handicap: playerB.handicapIndex });
    }

    // Emit live draw event for each match populated
    if (io) {
      io.to(`draw-${tournamentId}`).emit('draw:match', {
        matchId: updated.id,
        roundNumber: updated.roundNumber,
        matchNumber: updated.matchNumber,
        playerA: updated.playerA,
        playerB: updated.playerB,
        isBye: !playerB,
        seedA: playerA?.seed,
        seedB: playerB?.seed,
      });
      // Stagger for dramatic effect
      await new Promise(r => setTimeout(r, 1500));
    }

    // Auto-advance byes to next round
    if (playerA && !playerB && updated.nextMatchId) {
      const slot = matchNum % 2 === 1 ? 'playerAId' : 'playerBId';
      await prisma.match.update({
        where: { id: updated.nextMatchId },
        data: { [slot]: playerA.playerId },
      });
    }
  }

  return { totalMatches: createdMatches.length, numRounds, bracketSize, seeded: useSeeding, seedings };
}

async function getBracket(tournamentId, stage) {
  const matches = await prisma.match.findMany({
    where: { tournamentId, stage },
    include: {
      playerA: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
      playerB: { select: { id: true, firstName: true, lastName: true, handicapIndex: true } },
      winner: { select: { id: true, firstName: true, lastName: true } },
      venueClub: { select: { id: true, name: true } },
    },
    orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
  });

  // Group by round
  const rounds = {};
  for (const m of matches) {
    if (!rounds[m.roundNumber]) rounds[m.roundNumber] = [];
    rounds[m.roundNumber].push(m);
  }

  return { rounds, totalRounds: Object.keys(rounds).length };
}

module.exports = { generateKnockoutDraw, getBracket, seedByHandicap };

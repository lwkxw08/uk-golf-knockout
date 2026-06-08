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

async function generateKnockoutDraw(tournamentId, stage, entries, io) {
  const shuffled = shuffle(entries);
  const bracketSize = nextPowerOf2(shuffled.length);
  const numRounds = totalRoundsForBracket(bracketSize);
  const numByes = bracketSize - shuffled.length;

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
  let playerIdx = 0;

  for (let matchNum = 1; matchNum <= round1Matches; matchNum++) {
    const match = matchMap[`1-${matchNum}`];
    const playerA = shuffled[playerIdx] || null;
    const playerB = shuffled[playerIdx + 1] || null;
    playerIdx += 2;

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
        playerA: { select: { id: true, firstName: true, lastName: true } },
        playerB: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Emit live draw event for each match populated
    if (io) {
      io.to(`draw-${tournamentId}`).emit('draw:match', {
        matchId: updated.id,
        roundNumber: updated.roundNumber,
        matchNumber: updated.matchNumber,
        playerA: updated.playerA,
        playerB: updated.playerB,
        isBye: !playerB,
      });
      // Stagger for dramatic effect
      await new Promise(r => setTimeout(r, 1500));
    }

    // Auto-advance byes to next round
    if (playerA && !playerB && updated.nextMatchId) {
      const nextMatch = await prisma.match.findUnique({ where: { id: updated.nextMatchId } });
      const slot = matchNum % 2 === 1 ? 'playerAId' : 'playerBId';
      await prisma.match.update({
        where: { id: updated.nextMatchId },
        data: { [slot]: playerA.playerId },
      });
    }
  }

  return { totalMatches: createdMatches.length, numRounds, bracketSize };
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

module.exports = { generateKnockoutDraw, getBracket };

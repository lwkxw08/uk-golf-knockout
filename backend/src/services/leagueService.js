/**
 * League Service — handles draw generation, scoring, and standings for Regional League stage.
 *
 * Draw constraints:
 *  - Each player plays exactly `matchCount` matches (default 6)
 *  - Exactly `homeCount` at home, `awayCount` away (default 3/3)
 *  - No player faces the same opponent twice
 *  - No player faces someone from their own home club
 *  - Matches are assigned to game weeks (1 match per player per week)
 *
 * Scoring (per match):
 *  - Win: 10 pts, Halved: 5, Loss: 0
 *  - Win by 3-4 holes: +2 bonus
 *  - Win by 5+ holes: +3 bonus (replaces +2)
 *  - Lose by 1 hole: +2
 *  - Lose by 2 holes: +1
 *  - Match reaches 18th hole: +1 to both
 *  - Away win: +1
 *  - Maximum per match: 14 pts
 *
 * Tie-break order:
 *  1. Total league points
 *  2. Number of wins
 *  3. Head-to-head result
 *  4. Away wins
 *  5. Total holes-up differential
 *  6. Fewest holes lost
 *  7. Best result against highest-ranked opponent
 */

const prisma = require('../config/prisma');

// ─── DEFAULT LEAGUE SCORING CONFIG ──────────────────────────────────────────
const DEFAULT_LEAGUE_SCORING = {
  win: 10,
  halved: 5,
  loss: 0,
  winBy3to4Bonus: 2,
  winBy5PlusBonus: 3,
  loseBy1Bonus: 2,
  loseBy2Bonus: 1,
  reached18thBonus: 1,
  awayWinBonus: 1,
  maxPerMatch: 14,
};

// ─── DRAW GENERATION ────────────────────────────────────────────────────────

/**
 * Generate a full league fixture schedule.
 *
 * @param {Array} players - [{id, homeClubId}]
 * @param {number} matchCount - total matches per player (default 6)
 * @param {number} homeCount - home matches per player (default 3)
 * @param {Array} existingMatches - already-played matches to account for
 *   [{gameWeek, playerAId, playerBId, isHomeForPlayerA}]
 * @returns {Array} fixtures [{gameWeek, playerAId, playerBId, isHomeForPlayerA, venueClubId}]
 *   Only returns NEW fixtures (not existing ones)
 */
function generateLeagueFixtures(players, matchCount = 6, homeCount = 3, existingMatches = []) {
  const awayCount = matchCount - homeCount;
  const n = players.length;

  if (n < matchCount + 1) {
    throw new Error(`Need at least ${matchCount + 1} players for a ${matchCount}-match league. Got ${n}.`);
  }

  // Build adjacency constraints: can't play someone from same club
  const sameClub = {};
  for (const p of players) {
    if (!sameClub[p.homeClubId]) sameClub[p.homeClubId] = [];
    sameClub[p.homeClubId].push(p.id);
  }

  // Determine which weeks already have fixtures
  const existingWeeks = new Set(existingMatches.map(m => m.gameWeek));
  const weeksToGenerate = [];
  for (let w = 1; w <= matchCount; w++) {
    if (!existingWeeks.has(w)) weeksToGenerate.push(w);
  }

  // If nothing to generate, return empty
  if (weeksToGenerate.length === 0) return [];

  const playerMap = {};
  for (const p of players) playerMap[p.id] = p;

  const fixtures = [];
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Track: opponents played, home/away counts
    const opponents = {};
    const homePlayed = {};
    const awayPlayed = {};
    const weekMatches = {};

    for (const p of players) {
      opponents[p.id] = new Set();
      homePlayed[p.id] = 0;
      awayPlayed[p.id] = 0;
      weekMatches[p.id] = new Set();
    }

    // Pre-populate state from existing matches
    for (const m of existingMatches) {
      const homeId = m.isHomeForPlayerA ? m.playerAId : m.playerBId;
      const awayId = m.isHomeForPlayerA ? m.playerBId : m.playerAId;
      if (opponents[m.playerAId]) opponents[m.playerAId].add(m.playerBId);
      if (opponents[m.playerBId]) opponents[m.playerBId].add(m.playerAId);
      if (homePlayed[homeId] != null) homePlayed[homeId]++;
      if (awayPlayed[awayId] != null) awayPlayed[awayId]++;
      if (weekMatches[m.playerAId]) weekMatches[m.playerAId].add(m.gameWeek);
      if (weekMatches[m.playerBId]) weekMatches[m.playerBId].add(m.gameWeek);
    }

    fixtures.length = 0;
    let success = true;

    for (const week of weeksToGenerate) {
      const weekFixtures = generateGameWeek(
        players, week, opponents, homePlayed, awayPlayed,
        weekMatches, homeCount, awayCount, sameClub, playerMap
      );

      if (!weekFixtures) {
        success = false;
        break;
      }

      fixtures.push(...weekFixtures);
    }

    if (success) {
      // Verify constraints for new weeks: each player who still needs matches got them
      const allValid = players.every(p => {
        const totalOpponents = opponents[p.id].size;
        const totalHome = homePlayed[p.id];
        const totalAway = awayPlayed[p.id];
        return totalOpponents === matchCount &&
               totalHome === homeCount &&
               totalAway === awayCount;
      });
      if (allValid) return fixtures;
    }
  }

  throw new Error('Failed to generate valid league fixtures after maximum attempts. Try with more players or fewer constraints.');
}

/**
 * Generate pairings for a single game week.
 * Uses constraint-aware matching: sorts players by how constrained they are
 * (must-be-home / must-be-away, fewest valid opponents) and uses backtracking.
 */
function generateGameWeek(players, week, opponents, homePlayed, awayPlayed, weekMatches, homeCount, awayCount, sameClub, playerMap) {
  const matchCount = homeCount + awayCount;

  // Get eligible players (haven't played this week and still need matches)
  const eligible = players.filter(p =>
    !weekMatches[p.id].has(week) &&
    opponents[p.id].size < matchCount
  );

  if (eligible.length < 2) return null;

  // Shuffle for randomness then sort most-constrained first
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  // For each player, compute how constrained they are
  function constraintScore(p) {
    let score = 0;
    const validOpponents = shuffled.filter(o =>
      o.id !== p.id &&
      !opponents[p.id].has(o.id) &&
      o.homeClubId !== p.homeClubId
    ).length;
    score += (100 - validOpponents); // fewer opponents = more constrained
    // Must-be-home or must-be-away is very constrained
    if (homePlayed[p.id] >= homeCount) score += 50; // must be away
    if (awayPlayed[p.id] >= awayCount) score += 50; // must be home
    return score;
  }

  shuffled.sort((a, b) => constraintScore(b) - constraintScore(a));

  // Check if two players can be paired with valid home/away assignment
  function canPairWithHA(pA, pB) {
    if (pA.homeClubId === pB.homeClubId) return false;
    if (opponents[pA.id].has(pB.id)) return false;
    // At least one valid home/away arrangement must exist
    const aCanHome = homePlayed[pA.id] < homeCount;
    const aCanAway = awayPlayed[pA.id] < awayCount;
    const bCanHome = homePlayed[pB.id] < homeCount;
    const bCanAway = awayPlayed[pB.id] < awayCount;
    return (aCanHome && bCanAway) || (bCanHome && aCanAway);
  }

  // Backtracking approach to find a valid matching
  const paired = new Set();
  const weekFixtures = [];

  function backtrack(idx) {
    // Skip already-paired players
    while (idx < shuffled.length && paired.has(shuffled[idx].id)) idx++;
    if (idx >= shuffled.length) return true; // all processed

    const pA = shuffled[idx];

    // Find all valid partners from remaining unpaired
    const candidates = [];
    for (let j = idx + 1; j < shuffled.length; j++) {
      const pB = shuffled[j];
      if (paired.has(pB.id)) continue;
      if (canPairWithHA(pA, pB)) candidates.push(pB);
    }

    // Shuffle candidates for variety
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Sort by urgency (fewest remaining valid partners first)
    candidates.sort((a, b) => {
      const aValid = shuffled.filter(o => !paired.has(o.id) && o.id !== a.id && o.id !== pA.id && canPairWithHA(a, o)).length;
      const bValid = shuffled.filter(o => !paired.has(o.id) && o.id !== b.id && o.id !== pA.id && canPairWithHA(b, o)).length;
      return aValid - bValid; // pair with player who has fewest other options
    });

    for (const pB of candidates) {
      const { home, away } = assignHomeAway(pA, pB, homePlayed, awayPlayed, homeCount, awayCount);

      // Apply pairing
      weekFixtures.push({
        gameWeek: week,
        playerAId: home.id,
        playerBId: away.id,
        isHomeForPlayerA: true,
        venueClubId: home.homeClubId,
      });
      opponents[home.id].add(away.id);
      opponents[away.id].add(home.id);
      homePlayed[home.id]++;
      awayPlayed[away.id]++;
      weekMatches[home.id].add(week);
      weekMatches[away.id].add(week);
      paired.add(home.id);
      paired.add(away.id);

      if (backtrack(idx + 1)) return true;

      // Undo pairing
      weekFixtures.pop();
      opponents[home.id].delete(away.id);
      opponents[away.id].delete(home.id);
      homePlayed[home.id]--;
      awayPlayed[away.id]--;
      weekMatches[home.id].delete(week);
      weekMatches[away.id].delete(week);
      paired.delete(home.id);
      paired.delete(away.id);
    }

    // It's OK if this player can't be paired (odd player out) — skip them
    paired.add(pA.id);
    const skipResult = backtrack(idx + 1);
    paired.delete(pA.id);
    return skipResult;
  }

  const success = backtrack(0);
  return weekFixtures.length > 0 ? weekFixtures : null;
}

/**
 * Assign home/away based on who needs more home or away matches.
 */
function assignHomeAway(pA, pB, homePlayed, awayPlayed, homeCount, awayCount) {
  const aHome = homePlayed[pA.id];
  const aAway = awayPlayed[pA.id];
  const bHome = homePlayed[pB.id];
  const bAway = awayPlayed[pB.id];

  // If one player has maxed out home, the other must be home
  if (aHome >= homeCount && bHome < homeCount) return { home: pB, away: pA };
  if (bHome >= homeCount && aHome < homeCount) return { home: pA, away: pB };
  if (aAway >= awayCount && bAway < awayCount) return { home: pA, away: pB };
  if (bAway >= awayCount && aAway < awayCount) return { home: pB, away: pA };

  // Prefer giving home to whoever has fewer home matches
  if (aHome < bHome) return { home: pA, away: pB };
  if (bHome < aHome) return { home: pB, away: pA };

  // Random if equal
  return Math.random() < 0.5 ? { home: pA, away: pB } : { home: pB, away: pA };
}

// ─── SCORING ────────────────────────────────────────────────────────────────

/**
 * Calculate league points for both players from a completed match.
 *
 * @param {Object} match - { winnerId, playerAId, playerBId, isHomeForPlayerA, holesUpMargin, holesRemainingMargin }
 *   holesUpMargin: how many holes the winner was ahead (e.g. 3 for "3&2")
 *   holesRemainingMargin: holes remaining when match ended (e.g. 2 for "3&2"). 0 for decided on 18th.
 *   winnerId: null for halved match
 * @param {Object} config - scoring config (optional, uses defaults)
 * @returns {{ playerA: {points, bonus, detail}, playerB: {points, bonus, detail} }}
 */
function calculateLeaguePoints(match, config = DEFAULT_LEAGUE_SCORING) {
  const { winnerId, playerAId, playerBId, isHomeForPlayerA, holesUpMargin, holesRemainingMargin } = match;

  const aIsHome = isHomeForPlayerA;
  const bIsHome = !isHomeForPlayerA;

  let aPoints = 0;
  let bPoints = 0;
  const aDetail = {};
  const bDetail = {};

  const isHalved = !winnerId;
  const aWon = winnerId === playerAId;
  const bWon = winnerId === playerBId;
  const margin = holesUpMargin || 0;
  const remaining = holesRemainingMargin || 0;
  const reachedEighteen = remaining === 0 && !isHalved ? (margin === 1) : isHalved;
  // Match reaches 18th: decided on 18th hole (1-up win) or halved

  // Base points
  if (isHalved) {
    aPoints += config.halved;
    bPoints += config.halved;
    aDetail.base = 'Halved';
    bDetail.base = 'Halved';
  } else if (aWon) {
    aPoints += config.win;
    bPoints += config.loss;
    aDetail.base = 'Win';
    bDetail.base = 'Loss';
  } else {
    bPoints += config.win;
    aPoints += config.loss;
    bDetail.base = 'Win';
    aDetail.base = 'Loss';
  }

  // Margin bonuses (winner)
  if (!isHalved && margin >= 5) {
    if (aWon) { aPoints += config.winBy5PlusBonus; aDetail.marginBonus = `+${config.winBy5PlusBonus} (win by ${margin}+)`; }
    else { bPoints += config.winBy5PlusBonus; bDetail.marginBonus = `+${config.winBy5PlusBonus} (win by ${margin}+)`; }
  } else if (!isHalved && margin >= 3) {
    if (aWon) { aPoints += config.winBy3to4Bonus; aDetail.marginBonus = `+${config.winBy3to4Bonus} (win by ${margin})`; }
    else { bPoints += config.winBy3to4Bonus; bDetail.marginBonus = `+${config.winBy3to4Bonus} (win by ${margin})`; }
  }

  // Close loss bonuses (loser)
  if (!isHalved && margin === 1) {
    if (aWon) { bPoints += config.loseBy1Bonus; bDetail.closeLoss = `+${config.loseBy1Bonus} (lost by 1)`; }
    else { aPoints += config.loseBy1Bonus; aDetail.closeLoss = `+${config.loseBy1Bonus} (lost by 1)`; }
  } else if (!isHalved && margin === 2) {
    if (aWon) { bPoints += config.loseBy2Bonus; bDetail.closeLoss = `+${config.loseBy2Bonus} (lost by 2)`; }
    else { aPoints += config.loseBy2Bonus; aDetail.closeLoss = `+${config.loseBy2Bonus} (lost by 2)`; }
  }

  // Reached 18th bonus (both get it)
  if (reachedEighteen) {
    aPoints += config.reached18thBonus;
    bPoints += config.reached18thBonus;
    aDetail.reached18 = `+${config.reached18thBonus} (18th)`;
    bDetail.reached18 = `+${config.reached18thBonus} (18th)`;
  }

  // Away win bonus
  if (!isHalved) {
    if (aWon && !aIsHome) { aPoints += config.awayWinBonus; aDetail.awayWin = `+${config.awayWinBonus} (away win)`; }
    if (bWon && !bIsHome) { bPoints += config.awayWinBonus; bDetail.awayWin = `+${config.awayWinBonus} (away win)`; }
  }

  // Cap at max
  aPoints = Math.min(aPoints, config.maxPerMatch);
  bPoints = Math.min(bPoints, config.maxPerMatch);

  return {
    playerA: { points: aPoints, bonus: aPoints - (isHalved ? config.halved : (aWon ? config.win : config.loss)), detail: aDetail },
    playerB: { points: bPoints, bonus: bPoints - (isHalved ? config.halved : (bWon ? config.win : config.loss)), detail: bDetail },
  };
}

/**
 * Calculate holes differential from a match result.
 * "4&3" → winner +4, loser -4
 * "1 up" → winner +1, loser -1
 * "Halved" → 0, 0
 *
 * @param {Object} match - { winnerId, playerAId, holesUpMargin }
 * @returns {{ playerA: number, playerB: number }}
 */
function calculateHolesDifferential(match) {
  const { winnerId, playerAId, playerBId, holesUpMargin } = match;
  if (!winnerId) return { playerA: 0, playerB: 0 };

  const margin = holesUpMargin || 1;
  const aWon = winnerId === playerAId;
  return {
    playerA: aWon ? margin : -margin,
    playerB: aWon ? -margin : margin,
  };
}

// ─── STANDINGS CALCULATION ──────────────────────────────────────────────────

/**
 * Recalculate all league standings from completed matches.
 *
 * @param {string} tournamentId
 * @param {string} stageId
 * @param {Object} config - scoring config
 */
async function recalculateStandings(tournamentId, stageId, config = DEFAULT_LEAGUE_SCORING) {
  // Get all completed league matches for this stage
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      stage: 'REGIONAL_LEAGUE',
      status: { in: ['COMPLETED', 'RESULT_CONFIRMED'] },
      gameWeek: { not: null },
    },
    include: {
      playerA: true,
      playerB: true,
    },
  });

  // Get all league standings
  const standings = await prisma.leagueStanding.findMany({
    where: { tournamentId, stageId },
  });

  const standingMap = {};
  for (const s of standings) standingMap[s.playerId] = s;

  // Reset all counters
  for (const s of standings) {
    standingMap[s.playerId] = {
      ...s,
      played: 0, wins: 0, draws: 0, losses: 0,
      leaguePoints: 0, bonusPoints: 0, totalPoints: 0,
      holesWon: 0, holesLost: 0, holesDifferential: 0,
      awayWins: 0, homeWins: 0, matchesReached18: 0,
    };
  }

  // Process each match
  for (const match of matches) {
    if (!match.playerAId || !match.playerBId) continue;
    const sA = standingMap[match.playerAId];
    const sB = standingMap[match.playerBId];
    if (!sA || !sB) continue;

    const pts = calculateLeaguePoints(match, config);
    const diff = calculateHolesDifferential(match);

    // Update counts
    sA.played++;
    sB.played++;

    if (!match.winnerId) {
      sA.draws++;
      sB.draws++;
    } else if (match.winnerId === match.playerAId) {
      sA.wins++;
      sB.losses++;
      if (!match.isHomeForPlayerA) sA.awayWins++;
      else sA.homeWins++;
    } else {
      sB.wins++;
      sA.losses++;
      if (match.isHomeForPlayerA) sB.awayWins++;
      else sB.homeWins++;
    }

    // Points
    sA.leaguePoints += pts.playerA.points - pts.playerA.bonus;
    sA.bonusPoints += pts.playerA.bonus;
    sA.totalPoints += pts.playerA.points;
    sB.leaguePoints += pts.playerB.points - pts.playerB.bonus;
    sB.bonusPoints += pts.playerB.bonus;
    sB.totalPoints += pts.playerB.points;

    // Holes differential
    const margin = match.holesUpMargin || 0;
    if (match.winnerId === match.playerAId) {
      sA.holesWon += margin;
      sB.holesLost += margin;
    } else if (match.winnerId === match.playerBId) {
      sB.holesWon += margin;
      sA.holesLost += margin;
    }
    sA.holesDifferential = sA.holesWon - sA.holesLost;
    sB.holesDifferential = sB.holesWon - sB.holesLost;

    // Reached 18th
    const remaining = match.holesRemainingMargin || 0;
    const isHalved = !match.winnerId;
    const reached18 = remaining === 0 && (isHalved || margin === 1);
    if (reached18) {
      sA.matchesReached18++;
      sB.matchesReached18++;
    }
  }

  // Sort standings by tie-break order
  const sorted = Object.values(standingMap).sort((a, b) => {
    // 1. Total points (desc)
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    // 2. Wins (desc)
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 3. Head-to-head (check completed matches between them)
    // This is checked in a separate pass below
    // 4. Away wins (desc)
    if (b.awayWins !== a.awayWins) return b.awayWins - a.awayWins;
    // 5. Holes differential (desc)
    if (b.holesDifferential !== a.holesDifferential) return b.holesDifferential - a.holesDifferential;
    // 6. Fewest holes lost (asc)
    if (a.holesLost !== b.holesLost) return a.holesLost - b.holesLost;
    return 0;
  });

  // Head-to-head resolution for ties
  resolveHeadToHead(sorted, matches);

  // Assign positions
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].position = i + 1;
  }

  // Persist
  for (const s of sorted) {
    await prisma.leagueStanding.update({
      where: { id: s.id },
      data: {
        played: s.played,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        leaguePoints: s.leaguePoints,
        bonusPoints: s.bonusPoints,
        totalPoints: s.totalPoints,
        holesWon: s.holesWon,
        holesLost: s.holesLost,
        holesDifferential: s.holesDifferential,
        awayWins: s.awayWins,
        homeWins: s.homeWins,
        matchesReached18: s.matchesReached18,
        position: s.position,
      },
    });
  }

  return sorted;
}

/**
 * Resolve head-to-head ties. If two players are tied on points+wins,
 * check if they played each other and use that result.
 */
function resolveHeadToHead(sorted, matches) {
  // Build h2h lookup
  const h2h = {};
  for (const m of matches) {
    if (!m.playerAId || !m.playerBId || !m.winnerId) continue;
    const key = [m.playerAId, m.playerBId].sort().join(':');
    h2h[key] = m.winnerId;
  }

  // Bubble sort with h2h check when primary metrics are equal
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.totalPoints !== b.totalPoints || a.wins !== b.wins) continue;

      const key = [a.playerId, b.playerId].sort().join(':');
      const winner = h2h[key];
      if (winner === b.playerId) {
        // b beat a head-to-head — swap
        sorted[i] = b;
        sorted[j] = a;
      }
    }
  }
}

// ─── CLUB POINTS ────────────────────────────────────────────────────────────

/**
 * Update club season points from league standings.
 * Clubs earn points based on their players' league performance.
 */
async function updateClubSeasonPoints(season) {
  // Get all league standings for this season
  const standings = await prisma.leagueStanding.findMany({
    where: {
      tournament: { season },
    },
    include: {
      player: { include: { homeClub: { include: { region: true } } } },
    },
  });

  // Aggregate by club
  const clubPoints = {};
  for (const s of standings) {
    const clubId = s.clubId;
    if (!clubPoints[clubId]) {
      clubPoints[clubId] = {
        clubId,
        regionId: s.player?.homeClub?.regionId || null,
        totalPoints: 0,
        playerCount: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        leagueQualifiers: 0,
        nationalQualifiers: 0,
        players: new Set(),
      };
    }
    const cp = clubPoints[clubId];
    cp.players.add(s.playerId);
    cp.totalPoints += s.totalPoints;
    cp.matchesPlayed += s.played;
    cp.matchesWon += s.wins;
    if (s.qualified) cp.leagueQualifiers++;
  }

  // Upsert club points
  for (const cp of Object.values(clubPoints)) {
    await prisma.clubSeasonPoints.upsert({
      where: { season_clubId: { season, clubId: cp.clubId } },
      create: {
        season,
        clubId: cp.clubId,
        regionId: cp.regionId,
        totalPoints: cp.totalPoints,
        playerCount: cp.players.size,
        matchesPlayed: cp.matchesPlayed,
        matchesWon: cp.matchesWon,
        leagueQualifiers: cp.leagueQualifiers,
      },
      update: {
        totalPoints: cp.totalPoints,
        playerCount: cp.players.size,
        matchesPlayed: cp.matchesPlayed,
        matchesWon: cp.matchesWon,
        leagueQualifiers: cp.leagueQualifiers,
      },
    });
  }

  // Rank clubs
  const allClubPoints = await prisma.clubSeasonPoints.findMany({
    where: { season },
    orderBy: { totalPoints: 'desc' },
  });

  for (let i = 0; i < allClubPoints.length; i++) {
    await prisma.clubSeasonPoints.update({
      where: { id: allClubPoints[i].id },
      data: { position: i + 1 },
    });
  }
}

/**
 * Generate fixtures for a single game week with pre-existing constraints.
 * Used for regenerating individual weeks.
 */
function generateGameWeekConstrained(players, week, opponents, homePlayed, awayPlayed, weekMatches, homeCount, awayCount) {
  const sameClub = {};
  for (const p of players) {
    if (!sameClub[p.homeClubId]) sameClub[p.homeClubId] = [];
    sameClub[p.homeClubId].push(p.id);
  }
  const playerMap = {};
  for (const p of players) playerMap[p.id] = p;

  const matchCount = homeCount + awayCount;

  for (let attempt = 0; attempt < 30; attempt++) {
    const eligible = players.filter(p =>
      !weekMatches[p.id].has(week) &&
      opponents[p.id].size < matchCount
    );
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const paired = new Set();
    const weekFixtures = [];

    for (let i = 0; i < shuffled.length; i++) {
      const pA = shuffled[i];
      if (paired.has(pA.id)) continue;

      const candidates = shuffled.filter(pB => {
        if (pB.id === pA.id) return false;
        if (paired.has(pB.id)) return false;
        if (opponents[pA.id].has(pB.id)) return false;
        if (pA.homeClubId === pB.homeClubId) return false;
        return true;
      });

      if (candidates.length === 0) continue;

      const scored = candidates.map(c => ({
        player: c,
        score: (matchCount - opponents[c.id].size) * 10,
      })).sort((a, b) => b.score - a.score);

      const topN = Math.min(3, scored.length);
      const pick = scored[Math.floor(Math.random() * topN)].player;
      const { home, away } = assignHomeAway(pA, pick, homePlayed, awayPlayed, homeCount, awayCount);

      weekFixtures.push({
        gameWeek: week,
        playerAId: home.id,
        playerBId: away.id,
        isHomeForPlayerA: true,
        venueClubId: home.homeClubId,
      });

      paired.add(home.id);
      paired.add(away.id);
    }

    if (weekFixtures.length > 0) return weekFixtures;
  }

  return null;
}

module.exports = {
  DEFAULT_LEAGUE_SCORING,
  generateLeagueFixtures,
  generateGameWeekConstrained,
  calculateLeaguePoints,
  calculateHolesDifferential,
  recalculateStandings,
  updateClubSeasonPoints,
};

/**
 * Achievements & badges.
 *
 * Definitions live in code and are synced into the `achievements` table on boot
 * so they can be referenced/reported on without a migration per badge.
 * Awards are evaluated after a match result is confirmed.
 */

const prisma = require('../config/prisma');
const { notify } = require('./notificationService');

const DEFINITIONS = [
  { code: 'FIRST_MATCH', name: 'On the Tee', description: 'Played your first match', icon: 'flag', tier: 'BRONZE' },
  { code: 'FIRST_WIN', name: 'First Blood', description: 'Won your first match', icon: 'trophy', tier: 'BRONZE' },
  { code: 'AWAY_WIN', name: 'Road Warrior', description: 'Won a match away from home', icon: 'plane', tier: 'BRONZE' },
  { code: 'STREAK_3', name: 'Hat-trick', description: 'Won three matches in a row', icon: 'flame', tier: 'SILVER' },
  { code: 'STREAK_5', name: 'Five Star', description: 'Won five matches in a row', icon: 'flame', tier: 'GOLD' },
  { code: 'BIG_MARGIN', name: 'Dominant', description: 'Won a match by 5 holes or more', icon: 'zap', tier: 'SILVER' },
  { code: 'GIANT_KILLER', name: 'Giant Killer', description: 'Beat an opponent with a handicap 5+ lower than yours', icon: 'swords', tier: 'GOLD' },
  { code: 'COMEBACK', name: 'Comeback King', description: 'Won a match that went to the 18th', icon: 'rewind', tier: 'SILVER' },
  { code: 'BIRDIE', name: 'Birdie', description: 'Recorded a birdie in a match', icon: 'bird', tier: 'BRONZE' },
  { code: 'EAGLE', name: 'Eagle Eye', description: 'Recorded an eagle in a match', icon: 'eye', tier: 'SILVER' },
  { code: 'HOLE_IN_ONE', name: 'Hole in One', description: 'Recorded a hole in one', icon: 'target', tier: 'GOLD' },
  { code: 'CLUB_CHAMPION', name: 'Club Champion', description: 'Won your club qualifier', icon: 'crown', tier: 'GOLD' },
  { code: 'REGIONAL_QUALIFIER', name: 'Regional Contender', description: 'Reached the regional stage', icon: 'map', tier: 'SILVER' },
  { code: 'NATIONAL_FINALIST', name: 'National Finalist', description: 'Reached the national final', icon: 'star', tier: 'GOLD' },
  { code: 'SIX_OF_SIX', name: 'Full Season', description: 'Completed all six league matches', icon: 'calendar-check', tier: 'SILVER' },
];

async function syncDefinitions() {
  for (const def of DEFINITIONS) {
    await prisma.achievement.upsert({
      where: { code: def.code },
      update: { name: def.name, description: def.description, icon: def.icon, tier: def.tier },
      create: def,
    });
  }
}

async function award(playerId, code, matchId = null) {
  if (!playerId) return null;

  const achievement = await prisma.achievement.findUnique({ where: { code } });
  if (!achievement) return null;

  const existing = await prisma.playerAchievement.findUnique({
    where: { playerId_achievementId: { playerId, achievementId: achievement.id } },
  });
  if (existing) return null;

  const awarded = await prisma.playerAchievement.create({
    data: { playerId, achievementId: achievement.id, matchId },
  });

  await notify(playerId, {
    type: 'ACHIEVEMENT_UNLOCKED',
    title: `Achievement unlocked: ${achievement.name}`,
    body: achievement.description,
    link: '/profile?tab=achievements',
    data: { code: achievement.code, tier: achievement.tier, icon: achievement.icon },
  });

  return awarded;
}

function parseMargin(resultText) {
  if (!resultText) return 0;
  const amp = resultText.match(/(\d+)\s*&\s*(\d+)/);
  if (amp) return parseInt(amp[1], 10);
  const up = resultText.match(/(\d+)\s*up/i);
  if (up) return parseInt(up[1], 10);
  return 0;
}

async function getParByHole(clubId) {
  if (!clubId) return {};

  const tee = await prisma.clubTee.findFirst({
    where: { clubId },
    include: { holes: { select: { holeNumber: true, par: true } } },
  });
  if (!tee) return {};

  return Object.fromEntries(tee.holes.map((h) => [h.holeNumber, h.par]));
}

function wentTo18(resultText) {
  return /1\s*up|19th|18th/i.test(resultText || '');
}

/**
 * Evaluate every achievement that could have been triggered by a confirmed match.
 */
async function evaluateForMatch(matchId) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        result: true,
        playerA: true,
        playerB: true,
        holeScores: true,
        tournament: { select: { id: true, name: true } },
      },
    });
    if (!match || !match.winnerId) return;

    const participants = [match.playerAId, match.playerBId].filter(Boolean);
    const loserId = match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
    const winnerIsA = match.winnerId === match.playerAId;

    for (const playerId of participants) {
      await award(playerId, 'FIRST_MATCH', matchId);
    }

    await award(match.winnerId, 'FIRST_WIN', matchId);

    // Away win — isHomeForPlayerA tells us whose course it was
    if (match.isHomeForPlayerA !== null && match.isHomeForPlayerA !== undefined) {
      const winnerWasAway = winnerIsA ? !match.isHomeForPlayerA : match.isHomeForPlayerA;
      if (winnerWasAway) await award(match.winnerId, 'AWAY_WIN', matchId);
    }

    const margin = parseMargin(match.result?.resultText);
    if (margin >= 5) await award(match.winnerId, 'BIG_MARGIN', matchId);
    if (wentTo18(match.result?.resultText)) await award(match.winnerId, 'COMEBACK', matchId);

    // Giant killer — winner's handicap materially higher (worse) than opponent's
    const winner = winnerIsA ? match.playerA : match.playerB;
    const loser = winnerIsA ? match.playerB : match.playerA;
    if (winner?.handicapIndex != null && loser?.handicapIndex != null) {
      if (Number(winner.handicapIndex) - Number(loser.handicapIndex) >= 5) {
        await award(match.winnerId, 'GIANT_KILLER', matchId);
      }
    }

    // Scoring achievements from hole-by-hole data (par comes from the venue's tee card)
    const parByHole = await getParByHole(match.venueClubId);
    for (const hole of match.holeScores) {
      if (hole.score == null) continue;
      if (hole.score === 1) await award(hole.playerId, 'HOLE_IN_ONE', matchId);

      const par = parByHole[hole.holeNumber];
      if (par == null) continue;
      const diff = hole.score - par;
      if (diff <= -2) await award(hole.playerId, 'EAGLE', matchId);
      if (diff === -1) await award(hole.playerId, 'BIRDIE', matchId);
    }

    // Win streaks (chronological, across all tournaments)
    for (const playerId of participants) {
      const recent = await prisma.match.findMany({
        where: {
          status: 'COMPLETED',
          OR: [{ playerAId: playerId }, { playerBId: playerId }],
        },
        orderBy: { playedAt: 'desc' },
        take: 5,
        select: { winnerId: true },
      });
      let streak = 0;
      for (const m of recent) {
        if (m.winnerId === playerId) streak += 1;
        else break;
      }
      if (streak >= 3) await award(playerId, 'STREAK_3', matchId);
      if (streak >= 5) await award(playerId, 'STREAK_5', matchId);
    }

    // Stage milestones
    if (match.stage === 'NATIONAL_FINAL') {
      for (const playerId of participants) await award(playerId, 'NATIONAL_FINALIST', matchId);
    }
    if (match.stage === 'REGIONAL' || match.stage === 'REGIONAL_LEAGUE') {
      for (const playerId of participants) await award(playerId, 'REGIONAL_QUALIFIER', matchId);
    }

    // Six league matches completed
    if (match.stage === 'REGIONAL_LEAGUE') {
      for (const playerId of participants) {
        const played = await prisma.match.count({
          where: {
            tournamentId: match.tournamentId,
            stage: 'REGIONAL_LEAGUE',
            status: { in: ['COMPLETED', 'WALKOVER'] },
            OR: [{ playerAId: playerId }, { playerBId: playerId }],
          },
        });
        if (played >= 6) await award(playerId, 'SIX_OF_SIX', matchId);
      }
    }

    // Club champion — won the final round of a club qualifier
    if (match.stage === 'CLUB_QUALIFIER' && !match.nextMatchId) {
      await award(match.winnerId, 'CLUB_CHAMPION', matchId);
    }

    return { winnerId: match.winnerId, loserId };
  } catch (err) {
    console.error('[Achievements] Evaluation failed:', err.message);
  }
}

module.exports = { DEFINITIONS, syncDefinitions, award, evaluateForMatch };

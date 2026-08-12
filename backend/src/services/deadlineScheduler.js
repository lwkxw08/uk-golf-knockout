/**
 * Deadline enforcement.
 *
 * Keeps a four-month league on schedule without an admin chasing players:
 *  - escalating warnings at 7 / 3 / 1 days before a round deadline
 *  - automatic walkover once the deadline passes and the match is unplayed
 *  - automatic sign-off of a submitted result the opponent never responded to
 *
 * Responsibility for a walkover is decided from the scheduling audit trail: the
 * player who never proposed or accepted a time forfeits. If neither engaged, the
 * match is voided with no winner.
 */

const prisma = require('../config/prisma');
const { notify } = require('./notificationService');
const { sendMatchReminder } = require('./emailService');
const { recalculateStandings } = require('./leagueService');
const { logAudit } = require('./auditService');

const WARNING_DAYS = [7, 3, 1];
const AUTO_CONFIRM_DAYS = 7;
const POLL_MS = 30 * 60 * 1000;

let intervalId = null;
let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function daysBetween(from, to) {
  return Math.ceil((new Date(to) - new Date(from)) / (24 * 60 * 60 * 1000));
}

function playerName(player) {
  return player ? `${player.firstName} ${player.lastName}` : 'Your opponent';
}

// ─── WARNINGS ────────────────────────────────────────────────────────────

async function sendDeadlineWarnings() {
  const now = new Date();
  const horizon = new Date(now.getTime() + WARNING_DAYS[0] * 24 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: {
      status: { in: ['PENDING', 'SCHEDULED'] },
      roundDeadline: { gt: now, lte: horizon },
    },
    include: {
      playerA: { include: { user: { select: { email: true } } } },
      playerB: { include: { user: { select: { email: true } } } },
      tournament: { select: { name: true } },
    },
    take: 200,
  });

  for (const match of matches) {
    const daysLeft = daysBetween(now, match.roundDeadline);
    const stage = WARNING_DAYS.filter((d) => d >= daysLeft).length; // 1 at 7 days, 2 at 3, 3 at 1
    if (stage === 0 || match.deadlineRemindersSent >= stage) continue;

    const deadlineLabel = new Date(match.roundDeadline).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const urgency = daysLeft <= 1 ? 'Final warning' : `${daysLeft} days left`;

    for (const [player, opponent] of [[match.playerA, match.playerB], [match.playerB, match.playerA]]) {
      if (!player) continue;

      await notify(player.id, {
        type: 'DEADLINE_WARNING',
        title: `${urgency}: play your match`,
        body: `Your ${match.tournament.name} match against ${playerName(opponent)} must be played by ${deadlineLabel} or a walkover will be awarded.`,
        link: `/matches/${match.id}`,
        data: { matchId: match.id, daysLeft },
      });

      if (player.user?.email) {
        sendMatchReminder(
          player.user.email,
          player.firstName,
          match.tournament.name,
          playerName(opponent),
          match.roundDeadline
        ).catch((e) => console.error('[Deadline] Email failed:', e.message));
      }
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { deadlineRemindersSent: stage },
    });
  }
}

// ─── WALKOVERS ───────────────────────────────────────────────────────────

/**
 * Decide who (if anyone) forfeits, from the proposal trail.
 * @returns {{winnerId: string|null, reason: string}}
 */
function decideWalkover(match) {
  const proposals = match.scheduleProposals || [];
  const engaged = (playerId) => proposals.some((p) => (
    p.proposedById === playerId || (p.proposedById !== playerId && p.status === 'ACCEPTED')
  ));

  const aEngaged = match.playerAId ? engaged(match.playerAId) : false;
  const bEngaged = match.playerBId ? engaged(match.playerBId) : false;

  if (aEngaged && !bEngaged) {
    return { winnerId: match.playerAId, reason: `${playerName(match.playerB)} did not respond to any proposed time before the deadline` };
  }
  if (bEngaged && !aEngaged) {
    return { winnerId: match.playerBId, reason: `${playerName(match.playerA)} did not respond to any proposed time before the deadline` };
  }
  if (aEngaged && bEngaged) {
    return { winnerId: null, reason: 'Match agreed but not played before the deadline — voided, no points awarded' };
  }
  return { winnerId: null, reason: 'Neither player arranged the match before the deadline — voided, no points awarded' };
}

/**
 * @param {object} match match with playerA/playerB/tournament/scheduleProposals loaded
 * @param {{winnerId: string|null, reason: string}|null} override admin-supplied decision
 */
async function applyWalkover(match, override = null) {
  const { winnerId, reason } = override || decideWalkover(match);
  const loserId = winnerId
    ? (winnerId === match.playerAId ? match.playerBId : match.playerAId)
    : null;

  await prisma.match.update({
    where: { id: match.id },
    data: {
      status: 'WALKOVER',
      winnerId,
      walkoverReason: reason,
      walkoverAppliedAt: new Date(),
      playedAt: new Date(),
      holesUpMargin: 0,
      holesRemainingMargin: null,
    },
  });

  // Knockout progression still needs the winner moved on
  if (winnerId && match.nextMatchId) {
    const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
    if (nextMatch) {
      const slot = !nextMatch.playerAId ? 'playerAId' : 'playerBId';
      await prisma.match.update({ where: { id: match.nextMatchId }, data: { [slot]: winnerId } });
    }
  }

  if (loserId) {
    await prisma.tournamentEntry.updateMany({
      where: { tournamentId: match.tournamentId, playerId: loserId, stage: match.stage },
      data: { status: 'ELIMINATED' },
    });
  }

  // League tables must reflect the forfeit immediately
  if (match.stage === 'REGIONAL_LEAGUE') {
    const stage = await prisma.tournamentStage_.findFirst({
      where: { tournamentId: match.tournamentId, isLeague: true },
      select: { id: true },
    });
    if (stage) {
      await recalculateStandings(match.tournamentId, stage.id)
        .catch((e) => console.error('[Deadline] Standings recalc failed:', e.message));
    }
  }

  for (const player of [match.playerA, match.playerB]) {
    if (!player) continue;
    const won = winnerId === player.id;
    await notify(player.id, {
      type: 'WALKOVER_APPLIED',
      title: winnerId ? (won ? 'Walkover awarded in your favour' : 'Walkover awarded against you') : 'Match voided',
      body: `${match.tournament.name}: ${reason}. Contact an admin within 7 days if you believe this is wrong.`,
      link: `/matches/${match.id}`,
      data: { matchId: match.id, winnerId },
    });
  }

  await logAudit({
    action: 'MATCH_WALKOVER_AUTO',
    entity: 'Match',
    entityId: match.id,
    details: { reason, winnerId, tournamentId: match.tournamentId, stage: match.stage, gameWeek: match.gameWeek },
  });

  if (ioInstance) {
    ioInstance.to(`match-${match.id}`).emit('match:walkover', { matchId: match.id, winnerId, reason });
  }

  console.log(`[Deadline] Walkover applied to match ${match.id}: ${reason}`);
}

async function enforceDeadlines() {
  const now = new Date();

  const overdue = await prisma.match.findMany({
    where: {
      status: { in: ['PENDING', 'SCHEDULED'] },
      roundDeadline: { lt: now },
      walkoverAppliedAt: null,
      playerAId: { not: null },
      playerBId: { not: null },
    },
    include: {
      playerA: true,
      playerB: true,
      tournament: { select: { name: true } },
      scheduleProposals: true,
    },
    take: 100,
  });

  for (const match of overdue) {
    try {
      await applyWalkover(match);
    } catch (err) {
      console.error(`[Deadline] Failed to apply walkover to ${match.id}:`, err.message);
    }
  }
}

// ─── AUTO SIGN-OFF ───────────────────────────────────────────────────────

// A submitted result the opponent ignores for a week is treated as agreed
async function autoConfirmStaleResults() {
  const cutoff = new Date(Date.now() - AUTO_CONFIRM_DAYS * 24 * 60 * 60 * 1000);

  const stale = await prisma.match.findMany({
    where: {
      status: 'RESULT_SUBMITTED',
      result: { isConfirmed: false, disputeReason: null, submittedAt: { lt: cutoff } },
    },
    include: { result: true, playerA: true, playerB: true, tournament: { select: { name: true } } },
    take: 100,
  });

  for (const match of stale) {
    try {
      await prisma.matchResult.update({
        where: { id: match.result.id },
        data: { isConfirmed: true, confirmedAt: new Date() },
      });
      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'COMPLETED', playedAt: match.playedAt || new Date() },
      });

      if (match.stage === 'REGIONAL_LEAGUE') {
        const stage = await prisma.tournamentStage_.findFirst({
          where: { tournamentId: match.tournamentId, isLeague: true },
          select: { id: true },
        });
        if (stage) await recalculateStandings(match.tournamentId, stage.id).catch(() => {});
      }

      for (const player of [match.playerA, match.playerB]) {
        if (!player) continue;
        await notify(player.id, {
          type: 'RESULT_CONFIRMED',
          title: 'Result auto-confirmed',
          body: `${match.tournament.name}: "${match.result.resultText}" stood unchallenged for ${AUTO_CONFIRM_DAYS} days and now counts towards the standings.`,
          link: `/matches/${match.id}`,
          data: { matchId: match.id },
        });
      }

      await logAudit({
        action: 'MATCH_RESULT_AUTO_CONFIRMED',
        entity: 'Match',
        entityId: match.id,
        details: { resultText: match.result.resultText, afterDays: AUTO_CONFIRM_DAYS },
      });
    } catch (err) {
      console.error(`[Deadline] Auto-confirm failed for ${match.id}:`, err.message);
    }
  }
}

async function runOnce() {
  await sendDeadlineWarnings();
  await enforceDeadlines();
  await autoConfirmStaleResults();
}

function startDeadlineScheduler(io) {
  if (io) setIo(io);
  console.log('[DeadlineScheduler] Started — polling every 30m');

  intervalId = setInterval(() => {
    runOnce().catch((err) => console.error('[DeadlineScheduler] Error:', err.message));
  }, POLL_MS);

  setTimeout(() => {
    runOnce().catch((err) => console.error('[DeadlineScheduler] Initial run error:', err.message));
  }, 15000);
}

function stopDeadlineScheduler() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

module.exports = {
  startDeadlineScheduler,
  stopDeadlineScheduler,
  setIo,
  runOnce,
  decideWalkover,
  applyWalkover,
};

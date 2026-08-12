const prisma = require('../config/prisma');
const { sendMatchReminder, sendResultConfirmation, sendDrawDayReminder } = require('./emailService');

let schedulerInterval = null;

function startNotificationScheduler() {
  console.log('[NotificationScheduler] Started — polling every 60s');

  schedulerInterval = setInterval(async () => {
    try {
      await checkMatchReminders();
      await checkScoreVerificationReminders();
      await checkDrawReminders();
    } catch (err) {
      console.error('[NotificationScheduler] Error:', err.message);
    }
  }, 60 * 1000); // Every 60 seconds

  // Run immediately on start
  setTimeout(async () => {
    try {
      await checkMatchReminders();
    } catch (err) {
      console.error('[NotificationScheduler] Initial check error:', err.message);
    }
  }, 5000);
}

// Send reminders for matches approaching their deadline
async function checkMatchReminders() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  // Find matches with deadlines in the next 3 days that haven't been played
  const upcomingDeadlines = await prisma.match.findMany({
    where: {
      status: { in: ['PENDING', 'SCHEDULED'] },
      roundDeadline: {
        gte: now,
        lte: threeDaysFromNow,
      },
    },
    include: {
      playerA: { include: { user: { select: { email: true } } } },
      playerB: { include: { user: { select: { email: true } } } },
      tournament: { select: { name: true } },
    },
    take: 50,
  });

  for (const match of upcomingDeadlines) {
    if (!match.playerA || !match.playerB) continue;

    const daysUntil = Math.ceil((new Date(match.roundDeadline) - now) / (24 * 60 * 60 * 1000));

    // Only send 3-day and 1-day reminders
    if (daysUntil !== 3 && daysUntil !== 1) continue;

    // Send to both players
    sendMatchReminder(
      match.playerA.user.email,
      match.playerA.firstName,
      match.tournament.name,
      `${match.playerB.firstName} ${match.playerB.lastName}`,
      match.roundDeadline
    ).catch(console.error);

    sendMatchReminder(
      match.playerB.user.email,
      match.playerB.firstName,
      match.tournament.name,
      `${match.playerA.firstName} ${match.playerA.lastName}`,
      match.roundDeadline
    ).catch(console.error);
  }
}

// Remind players to verify opponent's score submission
async function checkScoreVerificationReminders() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pendingVerification = await prisma.match.findMany({
    where: {
      status: 'RESULT_SUBMITTED',
      result: {
        isConfirmed: false,
        submittedAt: { lte: oneDayAgo },
      },
    },
    include: {
      playerA: { include: { user: { select: { email: true } } } },
      playerB: { include: { user: { select: { email: true } } } },
      result: true,
      tournament: { select: { name: true } },
    },
    take: 20,
  });

  for (const match of pendingVerification) {
    if (!match.result || !match.playerA || !match.playerB) continue;

    // Find who needs to verify (the one who didn't submit)
    const verifier = match.result.submittedById === match.playerAId ? match.playerB : match.playerA;
    if (!verifier?.user?.email) continue;

    sendResultConfirmation(
      verifier.user.email,
      verifier.firstName,
      { resultText: match.result.resultText }
    ).catch(console.error);
  }
}

// Send draw day reminders
async function checkDrawReminders() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const upcomingDraws = await prisma.draw.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        gte: now,
        lte: oneHourFromNow,
      },
    },
    include: {
      tournament: {
        include: {
          entries: {
            where: { status: { in: ['ACTIVE', 'REGISTERED', 'LEAGUE_ACTIVE'] } },
            include: { player: { include: { user: { select: { email: true } } } } },
          },
        },
      },
    },
    take: 5,
  });

  for (const draw of upcomingDraws) {
    const hoursUntil = Math.round((new Date(draw.scheduledAt) - now) / (60 * 60 * 1000));

    for (const entry of draw.tournament.entries) {
      if (!entry.player?.user?.email) continue;
      sendDrawDayReminder(
        entry.player.user.email,
        entry.player.firstName,
        draw.tournament.name,
        draw.scheduledAt,
        hoursUntil
      ).catch(console.error);
    }
  }
}

function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

module.exports = { startNotificationScheduler, stopNotificationScheduler };

const prisma = require('../config/prisma');
const { sendEmail, emailWrapper } = require('./emailService');
const config = require('../config');

const PLATFORM_URL = config.clientUrl || 'https://ukgolfknockout.com';

async function getMembershipDurationMonths() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'membership_duration_months' } });
  return setting ? parseInt(setting.value) : 12;
}

async function checkMembershipReminders() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 30-day reminders
  const due30 = await prisma.playerMembership.findMany({
    where: {
      status: 'ACTIVE',
      reminder30Sent: false,
      currentPeriodEnd: { lte: in30Days, gt: in7Days },
    },
    include: { player: { include: { user: { select: { email: true } } } } },
  });

  for (const m of due30) {
    const email = m.player.user.email;
    const name = m.player.firstName;
    const expiryDate = m.currentPeriodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const html = emailWrapper(`
      <h2 style="color:#111;margin-top:0;">Membership Expiring Soon</h2>
      <p style="color:#374151;">Hi ${name},</p>
      <p style="color:#374151;">Your UK Golf Knockout membership expires on <strong>${expiryDate}</strong> — that's in about 30 days.</p>
      <p style="color:#374151;">Renew now to keep your ranking points, tournament access, and all premium features.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${PLATFORM_URL}/membership" style="display:inline-block;background:#15803d;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Renew Membership</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">If you don't renew, your membership will expire and you'll need to re-register for the next season.</p>
    `);

    try {
      await sendEmail(email, 'Your Membership Expires in 30 Days — UK Golf Knockout', html);
      await prisma.playerMembership.update({ where: { id: m.id }, data: { reminder30Sent: true } });
      console.log(`[MembershipReminder] 30-day reminder sent to ${email}`);
    } catch (err) {
      console.error(`[MembershipReminder] Failed to send 30-day to ${email}:`, err.message);
    }
  }

  // 7-day reminders
  const due7 = await prisma.playerMembership.findMany({
    where: {
      status: 'ACTIVE',
      reminder7Sent: false,
      currentPeriodEnd: { lte: in7Days, gt: now },
    },
    include: { player: { include: { user: { select: { email: true } } } } },
  });

  for (const m of due7) {
    const email = m.player.user.email;
    const name = m.player.firstName;
    const expiryDate = m.currentPeriodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const html = emailWrapper(`
      <h2 style="color:#111;margin-top:0;">⚠️ Membership Expiring in 7 Days</h2>
      <p style="color:#374151;">Hi ${name},</p>
      <p style="color:#374151;">Your UK Golf Knockout membership expires on <strong>${expiryDate}</strong> — just 7 days away!</p>
      <p style="color:#374151;">After this date, you'll lose access to:</p>
      <ul style="color:#374151;">
        <li>Tournament entry and match scheduling</li>
        <li>Ranking points and leaderboard position</li>
        <li>Premium features and match chat</li>
      </ul>
      <div style="text-align:center;margin:24px 0;">
        <a href="${PLATFORM_URL}/membership" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Renew Now — Don't Lose Your Spot</a>
      </div>
    `);

    try {
      await sendEmail(email, '⚠️ 7 Days Left — Renew Your Membership', html);
      await prisma.playerMembership.update({ where: { id: m.id }, data: { reminder7Sent: true } });
      console.log(`[MembershipReminder] 7-day reminder sent to ${email}`);
    } catch (err) {
      console.error(`[MembershipReminder] Failed to send 7-day to ${email}:`, err.message);
    }
  }

  // Expired — mark as expired and send final notification
  const expired = await prisma.playerMembership.findMany({
    where: {
      status: 'ACTIVE',
      expiryNotifSent: false,
      currentPeriodEnd: { lt: now },
    },
    include: { player: { include: { user: { select: { email: true } } } } },
  });

  for (const m of expired) {
    const email = m.player.user.email;
    const name = m.player.firstName;

    // Mark membership as expired
    await prisma.playerMembership.update({
      where: { id: m.id },
      data: { status: 'EXPIRED', expiryNotifSent: true },
    });

    // Update player record
    await prisma.player.update({
      where: { id: m.playerId },
      data: { membershipType: 'free', membershipExpiry: null },
    });

    const html = emailWrapper(`
      <h2 style="color:#111;margin-top:0;">Membership Expired</h2>
      <p style="color:#374151;">Hi ${name},</p>
      <p style="color:#374151;">Your UK Golf Knockout membership has expired. To continue competing in tournaments and maintain your ranking, please renew.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${PLATFORM_URL}/membership" style="display:inline-block;background:#15803d;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Renew Membership</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Your ranking points are preserved for 30 days after expiry. After that, they will be reset.</p>
    `);

    try {
      await sendEmail(email, 'Your Membership Has Expired — UK Golf Knockout', html);
      console.log(`[MembershipReminder] Expiry notification sent to ${email}`);
    } catch (err) {
      console.error(`[MembershipReminder] Failed to send expiry to ${email}:`, err.message);
    }
  }

  const totalProcessed = due30.length + due7.length + expired.length;
  if (totalProcessed > 0) {
    console.log(`[MembershipReminder] Processed: ${due30.length} x 30-day, ${due7.length} x 7-day, ${expired.length} x expired`);
  }
}

function startMembershipScheduler() {
  // Run every hour
  setInterval(checkMembershipReminders, 60 * 60 * 1000);
  // Initial run after 10 seconds
  setTimeout(checkMembershipReminders, 10000);
  console.log('[MembershipScheduler] Started — checking every hour for expiring memberships');
}

module.exports = { startMembershipScheduler, checkMembershipReminders, getMembershipDurationMonths };

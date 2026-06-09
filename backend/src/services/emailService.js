const sgMail = require('@sendgrid/mail');
const config = require('../config');

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

const BRAND_COLOR = '#15803d';
const PLATFORM_NAME = 'UK Golf Knockout Network';

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:${BRAND_COLOR};padding:20px 30px;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${PLATFORM_NAME}</h1>
    </div>
    <div style="background:#fff;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
      ${content}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">
      &copy; ${new Date().getFullYear()} ${PLATFORM_NAME}. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}

async function sendEmail(to, subject, html) {
  if (!config.sendgrid.apiKey) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return;
  }

  await sgMail.send({
    to,
    from: config.sendgrid.fromEmail,
    subject,
    html,
  });
}

async function sendEntryConfirmation(playerEmail, playerName, tournamentName, clubName) {
  const subject = `Entry Confirmed — ${tournamentName}`;
  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">Entry Confirmed!</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">Your entry into <strong>${tournamentName}</strong> representing <strong>${clubName}</strong> has been confirmed.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#166534;font-weight:600;">What happens next?</p>
      <ul style="color:#166534;margin:8px 0 0;padding-left:20px;">
        <li>You'll receive an email when the draw is made</li>
        <li>Check your dashboard for match details</li>
        <li>Arrange matches with your opponent at a mutually convenient time</li>
      </ul>
    </div>
    <a href="#" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View My Dashboard</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Good luck! — ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

async function sendDrawNotification(playerEmail, playerName, tournamentName, opponent, round) {
  const subject = `${tournamentName} — Round ${round} Draw`;
  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">Your Draw is In!</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">The draw for <strong>${tournamentName}</strong> Round ${round} has been made.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 8px;color:#1e40af;font-size:14px;">YOUR OPPONENT</p>
      <p style="margin:0;color:#111;font-size:24px;font-weight:700;">${opponent || 'BYE (auto-advance)'}</p>
    </div>
    ${opponent ? `
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#854d0e;font-weight:600;">Action Required</p>
      <p style="margin:8px 0 0;color:#854d0e;">Please contact your opponent to arrange your match. Both players must agree on a date, time, and venue.</p>
    </div>` : '<p style="color:#374151;">You have received a bye and will automatically advance to the next round.</p>'}
    <a href="#" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Bracket</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Good luck! — ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

async function sendResultConfirmation(playerEmail, playerName, matchDetails) {
  const subject = `Match Result — Confirmation Required`;
  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">Please Confirm Your Match Result</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">Your opponent has submitted a result for your match.</p>
    <div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 8px;color:#7c3aed;font-size:14px;">SUBMITTED RESULT</p>
      <p style="margin:0;color:#111;font-size:20px;font-weight:700;">${matchDetails.resultText}</p>
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#991b1b;font-weight:600;">Important</p>
      <p style="margin:8px 0 0;color:#991b1b;">Both players must sign off on the result. If you disagree, you can dispute the result and an admin will review.</p>
    </div>
    <div style="text-align:center;">
      <a href="#" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:8px;">Confirm Result</a>
      <a href="#" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Dispute Result</a>
    </div>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">— ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

async function sendMatchReminder(playerEmail, playerName, tournamentName, opponentName, deadlineDate) {
  const subject = `Match Reminder — ${tournamentName}`;
  const formattedDeadline = deadlineDate ? new Date(deadlineDate).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) : 'as soon as possible';

  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">Match Reminder</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">This is a reminder that your match in <strong>${tournamentName}</strong> against <strong>${opponentName}</strong> needs to be played.</p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#92400e;font-weight:600;">Deadline: ${formattedDeadline}</p>
      <p style="margin:8px 0 0;color:#92400e;">Please arrange your match before the deadline to avoid a walkover.</p>
    </div>
    <a href="#" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View My Matches</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">— ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

async function sendStagePromotionNotification(playerEmail, playerName, tournamentName, fromStage, toStage) {
  const stageLabels = { CLUB_QUALIFIER: 'Club Qualifier', REGIONAL: 'Regional', NATIONAL_FINAL: 'National Final' };
  const subject = `Congratulations! You've Qualified — ${tournamentName}`;
  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">Congratulations!</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">Outstanding news! You have qualified from the <strong>${stageLabels[fromStage] || fromStage}</strong> stage and have been promoted to the <strong>${stageLabels[toStage] || toStage}</strong> stage of <strong>${tournamentName}</strong>!</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;color:#166534;font-size:48px;">🏆</p>
      <p style="margin:8px 0 0;color:#166534;font-size:18px;font-weight:700;">You're through to the ${stageLabels[toStage] || toStage}!</p>
    </div>
    <p style="color:#374151;">The draw for the next stage will be announced soon. Keep an eye on your dashboard.</p>
    <a href="#" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View My Dashboard</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">— ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

async function sendDrawDayAnnouncement(playerEmail, playerName, tournamentName, drawDate, drawPageUrl) {
  const formatted = new Date(drawDate).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const subject = `League Draw Announced — ${tournamentName}`;
  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">The League Draw Date is Set!</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">The fixture draw for <strong>${tournamentName}</strong> has been scheduled.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 4px;color:#1e40af;font-size:14px;">DRAW DATE</p>
      <p style="margin:0;color:#111;font-size:22px;font-weight:700;">${formatted}</p>
    </div>
    <p style="color:#374151;">Watch the draw live on the platform — your 6 match fixtures (3 home, 3 away) will be revealed week-by-week in real time.</p>
    ${drawPageUrl ? `<a href="${drawPageUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Watch the Live Draw</a>` : ''}
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Good luck! — ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

async function sendDrawDayReminder(playerEmail, playerName, tournamentName, drawDate, hoursUntil) {
  const formatted = new Date(drawDate).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const timeLabel = hoursUntil <= 1 ? 'starting soon' : `in ${hoursUntil} hours`;
  const subject = `Draw Day Reminder — ${tournamentName} (${timeLabel})`;
  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">Draw Day Reminder</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">The fixture draw for <strong>${tournamentName}</strong> is <strong>${timeLabel}</strong>!</p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 4px;color:#92400e;font-size:14px;">STARTING</p>
      <p style="margin:0;color:#111;font-size:22px;font-weight:700;">${formatted}</p>
    </div>
    <p style="color:#374151;">Head to the Live Draw page to watch your fixtures being revealed in real time. Find out who you'll be playing, where, and when!</p>
    <a href="#" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Watch the Live Draw</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">— ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

async function sendLeagueFixtureNotification(playerEmail, playerName, tournamentName, fixtures) {
  const fixtureRows = fixtures.map(f => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;">Week ${f.gameWeek}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-weight:600;">${f.opponent}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
        <span style="background:${f.isHome ? '#dcfce7' : '#dbeafe'};color:${f.isHome ? '#166534' : '#1e40af'};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${f.isHome ? 'HOME' : 'AWAY'}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${f.venue || '-'}</td>
    </tr>
  `).join('');

  const subject = `Your League Fixtures — ${tournamentName}`;
  const html = emailWrapper(`
    <h2 style="color:#111;margin-top:0;">Your League Fixtures</h2>
    <p style="color:#374151;">Hi ${playerName},</p>
    <p style="color:#374151;">The draw for <strong>${tournamentName}</strong> is complete! Here are your 6 match fixtures:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:13px;border-bottom:2px solid #e5e7eb;">Week</th>
        <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:13px;border-bottom:2px solid #e5e7eb;">Opponent</th>
        <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:13px;border-bottom:2px solid #e5e7eb;">H/A</th>
        <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:13px;border-bottom:2px solid #e5e7eb;">Venue</th>
      </tr>
      ${fixtureRows}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#166534;font-weight:600;">What happens next?</p>
      <ul style="color:#166534;margin:8px 0 0;padding-left:20px;">
        <li>Contact each opponent to arrange a mutually convenient date</li>
        <li>Home player's course is the venue unless otherwise agreed</li>
        <li>Submit your scores after each match via the platform</li>
      </ul>
    </div>
    <a href="#" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View My Dashboard</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Good luck! — ${PLATFORM_NAME}</p>
  `);
  return sendEmail(playerEmail, subject, html);
}

module.exports = {
  sendEmail,
  sendEntryConfirmation,
  sendDrawNotification,
  sendResultConfirmation,
  sendMatchReminder,
  sendStagePromotionNotification,
  sendDrawDayAnnouncement,
  sendDrawDayReminder,
  sendLeagueFixtureNotification,
};

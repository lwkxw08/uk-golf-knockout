const sgMail = require('@sendgrid/mail');
const config = require('../config');

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
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

async function sendDrawNotification(playerEmail, playerName, tournamentName, opponent, round) {
  const subject = `${tournamentName} - Round ${round} Draw`;
  const html = `
    <h2>Your Draw is In!</h2>
    <p>Hi ${playerName},</p>
    <p>The draw for <strong>${tournamentName}</strong> Round ${round} has been made.</p>
    <p>You have been drawn against: <strong>${opponent || 'BYE (auto-advance)'}</strong></p>
    <p>Please arrange your match at a mutually convenient time.</p>
    <p>Good luck!</p>
    <p>— UK Golf Knockout Network</p>
  `;
  return sendEmail(playerEmail, subject, html);
}

async function sendResultConfirmation(playerEmail, playerName, matchDetails) {
  const subject = `Match Result Confirmation Required`;
  const html = `
    <h2>Please Confirm Your Match Result</h2>
    <p>Hi ${playerName},</p>
    <p>Your opponent has submitted a result for your match.</p>
    <p><strong>Result submitted:</strong> ${matchDetails.resultText}</p>
    <p>Please log in to confirm or dispute this result.</p>
    <p>— UK Golf Knockout Network</p>
  `;
  return sendEmail(playerEmail, subject, html);
}

async function sendEntryConfirmation(playerEmail, playerName, tournamentName, clubName) {
  const subject = `Entry Confirmed - ${tournamentName}`;
  const html = `
    <h2>Entry Confirmed!</h2>
    <p>Hi ${playerName},</p>
    <p>Your entry into <strong>${tournamentName}</strong> representing <strong>${clubName}</strong> has been confirmed.</p>
    <p>You will be notified when the draw is made.</p>
    <p>Good luck!</p>
    <p>— UK Golf Knockout Network</p>
  `;
  return sendEmail(playerEmail, subject, html);
}

module.exports = { sendEmail, sendDrawNotification, sendResultConfirmation, sendEntryConfirmation };

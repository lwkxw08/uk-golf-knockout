/**
 * Central notification fan-out.
 *
 * A single notify() call persists an in-app notification, pushes it live over
 * Socket.io to the player's room, and delivers a web push where the player has
 * subscribed — all subject to the player's notification preferences.
 */

const webpush = require('web-push');
const prisma = require('../config/prisma');
const config = require('../config');

let ioInstance = null;
let pushReady = false;

if (config.push.publicKey && config.push.privateKey) {
  webpush.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey);
  pushReady = true;
}

function setIo(io) {
  ioInstance = io;
}

function isPushConfigured() {
  return pushReady;
}

function playerRoom(playerId) {
  return `player-${playerId}`;
}

async function getPreferences(playerId) {
  const pref = await prisma.notificationPreference.findUnique({ where: { playerId } });
  return pref || { email: true, push: true, mutedTypes: [] };
}

async function sendPush(playerId, payload) {
  if (!pushReady) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { playerId } });
  const stale = [];

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      // 404/410 mean the browser dropped the subscription — prune it
      if (err.statusCode === 404 || err.statusCode === 410) stale.push(sub.id);
      else console.error('[Push] Send failed:', err.statusCode || err.message);
    }
  }));

  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
  }
}

/**
 * @param {string} playerId
 * @param {{type: string, title: string, body: string, link?: string, data?: object}} input
 */
async function notify(playerId, input) {
  if (!playerId) return null;

  const { type, title, body, link = null, data = null } = input;

  try {
    const prefs = await getPreferences(playerId);
    if (prefs.mutedTypes?.includes(type)) return null;

    const notification = await prisma.notification.create({
      data: { playerId, type, title, body, link, data },
    });

    if (ioInstance) {
      const unreadCount = await prisma.notification.count({ where: { playerId, isRead: false } });
      ioInstance.to(playerRoom(playerId)).emit('notification:new', { notification, unreadCount });
    }

    if (prefs.push !== false) {
      // `url` is the key the service worker reads for the click target
      await sendPush(playerId, { title, body, url: link || '/notifications', type, id: notification.id });
    }

    return notification;
  } catch (err) {
    // Notifications must never break the action that triggered them
    console.error('[Notify] Failed:', err.message);
    return null;
  }
}

async function notifyMany(playerIds, input) {
  const unique = [...new Set(playerIds.filter(Boolean))];
  return Promise.all(unique.map((id) => notify(id, input)));
}

module.exports = { setIo, notify, notifyMany, isPushConfigured, playerRoom };

import { api } from '../api/client';

const DRAFT_PREFIX = 'scorecard-draft:';
const QUEUE_KEY = 'scorecard-queue';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full or blocked (private mode) — scoring still works in memory
    return false;
  }
}

export function saveDraft(matchId, scores) {
  return write(`${DRAFT_PREFIX}${matchId}`, { scores, savedAt: new Date().toISOString() });
}

export function loadDraft(matchId) {
  return read(`${DRAFT_PREFIX}${matchId}`, null);
}

export function clearDraft(matchId) {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${matchId}`);
  } catch {
    // nothing to clean up
  }
}

export function getQueue() {
  return read(QUEUE_KEY, []);
}

export function queueSubmission(entry) {
  const queue = getQueue().filter((q) => q.matchId !== entry.matchId);
  queue.push({ ...entry, queuedAt: new Date().toISOString() });
  return write(QUEUE_KEY, queue);
}

export function removeFromQueue(matchId) {
  write(QUEUE_KEY, getQueue().filter((q) => q.matchId !== matchId));
}

export function isQueued(matchId) {
  return getQueue().some((q) => q.matchId === matchId);
}

/**
 * Replays queued scorecards. Entries are only dropped once the server has
 * accepted them, or when it rejects them outright (a retry would never help).
 * @returns {Promise<{ synced: string[], failed: string[] }>}
 */
export async function flushQueue() {
  const queue = getQueue();
  const synced = [];
  const failed = [];

  for (const entry of queue) {
    try {
      if (entry.method === 'PUT') await api.put(`/scoring/${entry.matchId}/scores`, entry.payload);
      else await api.post(`/scoring/${entry.matchId}/scores`, entry.payload);
      synced.push(entry.matchId);
      removeFromQueue(entry.matchId);
      clearDraft(entry.matchId);
    } catch (err) {
      if (err.message === 'Network error') {
        failed.push(entry.matchId);
      } else {
        // The server saw it and refused it — keep the draft so the player can fix it
        failed.push(entry.matchId);
        removeFromQueue(entry.matchId);
      }
    }
  }

  return { synced, failed };
}

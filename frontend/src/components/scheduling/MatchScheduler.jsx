import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, MapPin, Loader2, Check, X, AlertTriangle, Send } from 'lucide-react';
import { api } from '../../api/client';

const SLOT_LABELS = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function daysUntil(value) {
  return Math.ceil((new Date(value) - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function MatchScheduler({ match, onScheduled }) {
  const [data, setData] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customSlot, setCustomSlot] = useState('MORNING');

  const load = useCallback(async () => {
    try {
      const [suggestions, props] = await Promise.all([
        api.get(`/availability/match/${match.id}/suggestions`),
        api.get(`/availability/match/${match.id}/proposals`),
      ]);
      setData(suggestions);
      setProposals(props.proposals || []);
    } catch (err) {
      setError(err.message);
    }
  }, [match.id]);

  useEffect(() => { load(); }, [load]);

  const propose = async (date, slot) => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/availability/match/${match.id}/propose`, { date, slot });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const respond = async (proposalId, accept) => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/availability/proposals/${proposalId}/respond`, { accept });
      await load();
      if (accept && onScheduled) onScheduled();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const opponent = data?.opponent;
  const deadline = data?.deadline || match.roundDeadline;
  const daysLeft = deadline ? daysUntil(deadline) : null;
  const pending = proposals.filter((p) => p.status === 'PENDING');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">
            vs {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Opponent TBC'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {match.tournament?.name}
            {match.gameWeek ? ` · Game week ${match.gameWeek}` : ''}
            {data?.venue ? ` · ${data.venue.name}` : ''}
          </p>
        </div>
        {deadline && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${daysLeft <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : daysLeft <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
            <AlertTriangle className="w-3 h-3" />
            {daysLeft <= 0 ? 'Deadline passed' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to play`}
          </span>
        )}
      </div>

      {match.status === 'SCHEDULED' && match.scheduledDate && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
          <Check className="w-4 h-4" /> Confirmed for {formatDate(match.scheduledDate)}
          {match.venueClub && <span className="text-gray-500 font-normal"><MapPin className="w-3 h-3 inline" /> {match.venueClub.name}</span>}
        </p>
      )}

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      {pending.length > 0 && (
        <div className="mt-4 space-y-2">
          {pending.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
              <p className="text-sm">
                <span className="font-medium">{formatDate(p.date)}</span>
                <span className="text-gray-500"> · {SLOT_LABELS[p.slot]}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {p.mine ? 'proposed by you — awaiting reply' : `proposed by ${p.proposedBy?.firstName || 'your opponent'}`}
                </span>
              </p>
              {!p.mine && (
                <div className="flex gap-2">
                  <button onClick={() => respond(p.id, true)} disabled={busy}
                    className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                    <Check className="w-3 h-3" /> Accept
                  </button>
                  <button onClick={() => respond(p.id, false)} disabled={busy}
                    className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
                    <X className="w-3 h-3" /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Times you both marked free</p>
        {!data ? (
          <p className="text-sm text-gray-400"><Loader2 className="w-3 h-3 animate-spin inline mr-1" /> checking…</p>
        ) : data.suggestions.length === 0 ? (
          <p className="text-sm text-gray-500">
            {data.opponentSlotCount === 0
              ? 'Your opponent has not marked any availability yet — propose a time below and they will be notified.'
              : 'No overlap yet. Add more slots above, or propose a specific time below.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.suggestions.map((s) => (
              <button
                key={`${s.date}-${s.slot}`}
                onClick={() => propose(s.date, s.slot)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 border border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                <CalendarClock className="w-3 h-3" /> {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-xs text-gray-500">
          <span className="block mb-1">Or propose another time</span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <select
          value={customSlot}
          onChange={(e) => setCustomSlot(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm"
        >
          {Object.entries(SLOT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <button
          onClick={() => customDate && propose(customDate, customSlot)}
          disabled={!customDate || busy}
          className="inline-flex items-center gap-1.5 bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-40"
        >
          <Send className="w-3 h-3" /> Propose
        </button>
      </div>
    </div>
  );
}

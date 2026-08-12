import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, Gavel, RotateCcw } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../../components/layout/PageHeader';

function daysLate(deadline) {
  return Math.floor((Date.now() - new Date(deadline)) / (24 * 60 * 60 * 1000));
}

function WalkoverForm({ match, onDone }) {
  const [winnerId, setWinnerId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/admin/matches/${match.id}/walkover`, {
        winnerId: winnerId || undefined,
        reason,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}
        className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm">
        <option value="">Void — no winner</option>
        <option value={match.playerA?.id}>{match.playerA?.firstName} {match.playerA?.lastName} wins</option>
        <option value={match.playerB?.id}>{match.playerB?.firstName} {match.playerB?.lastName} wins</option>
      </select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (recorded in the audit log)"
        className="flex-1 min-w-[14rem] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm"
      />
      <button onClick={submit} disabled={!reason.trim() || busy}
        className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-semibold px-3 py-2 rounded-lg transition">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />} Apply walkover
      </button>
      {error && <p className="text-xs text-red-500 w-full">{error}</p>}
    </div>
  );
}

function ReopenForm({ match, onDone }) {
  const [deadline, setDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/admin/matches/${match.id}/reopen`, {
        roundDeadline: new Date(deadline).toISOString(),
        reason,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
        className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being reopened?"
        className="flex-1 min-w-[14rem] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm" />
      <button onClick={submit} disabled={!deadline || !reason.trim() || busy}
        className="inline-flex items-center gap-1.5 bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-semibold px-3 py-2 rounded-lg transition">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Reopen with new deadline
      </button>
      {error && <p className="text-xs text-red-500 w-full">{error}</p>}
    </div>
  );
}

export default function DeadlineManagementPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/admin/matches/deadlines').then(setData).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Deadlines and walkovers"
        subtitle="Matches the automatic enforcer has flagged, and every walkover it has applied"
        icon={AlertTriangle}
        gradient="amber"
        compact
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Deadlines' }]}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <p className="text-xs text-gray-500">
          The scheduler warns players 7, 3 and 1 days out, then applies a walkover once the deadline passes:
          the player who tried to arrange a time wins, and the match is voided if neither engaged.
          Anything below can be overridden.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {!data ? (
          <p className="text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading queue…</p>
        ) : (
          <>
            <section>
              <h2 className="font-bold text-lg mb-3">Past deadline ({data.overdue.length})</h2>
              {data.overdue.length === 0 ? (
                <p className="text-sm text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  Nothing overdue.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.overdue.map((m) => (
                    <div key={m.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {m.playerA?.firstName} {m.playerA?.lastName} v {m.playerB?.firstName} {m.playerB?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {m.tournament?.name} · {m.status}
                            {m.gameWeek ? ` · GW${m.gameWeek}` : ''}
                            {m.venueClub ? ` · ${m.venueClub.name}` : ''}
                            {' · '}{daysLate(m.roundDeadline)} day(s) late
                            {' · '}{m.scheduleProposals.length} scheduling attempt(s)
                          </p>
                        </div>
                        <Link to={`/match/${m.id}/live`} className="text-xs text-green-700 dark:text-green-400 hover:underline">View match</Link>
                      </div>
                      <WalkoverForm match={m} onDone={load} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-bold text-lg mb-3">Walkovers applied ({data.walkovers.length})</h2>
              {data.walkovers.length === 0 ? (
                <p className="text-sm text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  No walkovers yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.walkovers.map((m) => (
                    <div key={m.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <p className="font-semibold text-sm">
                        {m.playerA?.firstName} {m.playerA?.lastName} v {m.playerB?.firstName} {m.playerB?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.tournament?.name} · winner: {m.winnerId === m.playerA?.id ? m.playerA?.firstName : m.winnerId === m.playerB?.id ? m.playerB?.firstName : 'void'}
                        {m.walkoverAppliedAt ? ` · ${new Date(m.walkoverAppliedAt).toLocaleDateString('en-GB')}` : ''}
                      </p>
                      {m.walkoverReason && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{m.walkoverReason}</p>}
                      <ReopenForm match={m} onDone={load} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

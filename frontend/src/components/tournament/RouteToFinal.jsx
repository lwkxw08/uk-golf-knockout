import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flag, Check, X, Minus, Loader2, MapPin, CalendarClock } from 'lucide-react';
import { api } from '../../api/client';

const STATUS_STYLES = {
  COMPLETE: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  IN_PROGRESS: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  ENTERED: 'border-gray-300 dark:border-gray-600',
  ELIMINATED: 'border-red-400 bg-red-50 dark:bg-red-900/20',
  NOT_REACHED: 'border-dashed border-gray-300 dark:border-gray-700 opacity-60',
};

const OUTCOME_ICON = { WIN: Check, LOSS: X, HALVED: Minus };

export default function RouteToFinal({ tournamentId, playerId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tournamentId || !playerId) return;
    api.get(`/tournaments/${tournamentId}/route/${playerId}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [tournamentId, playerId]);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Building your route…</p>;

  return (
    <div className="space-y-3">
      {data.route.map((stage, index) => (
        <div key={stage.stageId} className={`rounded-xl border-2 p-4 ${STATUS_STYLES[stage.status]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {index === data.route.length - 1
                ? <Trophy className="w-4 h-4 text-yellow-500" />
                : <Flag className="w-4 h-4 text-gray-400" />}
              <p className="font-semibold text-sm">{stage.name}</p>
              {stage.isLeague && stage.leaguePosition && (
                <span className="text-xs bg-white/70 dark:bg-gray-800 rounded-full px-2 py-0.5 border border-gray-200 dark:border-gray-700">
                  {stage.leaguePosition}
                  {stage.leaguePosition === 1 ? 'st' : stage.leaguePosition === 2 ? 'nd' : stage.leaguePosition === 3 ? 'rd' : 'th'}
                  {stage.leaguePoints != null ? ` · ${stage.leaguePoints} pts` : ''}
                  {stage.qualifyCount ? ` · top ${stage.qualifyCount} qualify` : ''}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {stage.status === 'NOT_REACHED' ? 'Not reached yet'
                : stage.status === 'ELIMINATED' ? 'Eliminated'
                : stage.status === 'COMPLETE' ? 'Complete'
                : `${stage.matchesPlayed} played · ${stage.matchesRemaining} to go`}
            </span>
          </div>

          {stage.matches.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {stage.matches.map((m) => {
                const Icon = OUTCOME_ICON[m.outcome];
                return (
                  <Link
                    key={m.matchId}
                    to={`/match/${m.matchId}/live`}
                    className="flex flex-wrap items-center gap-2 text-xs bg-white/70 dark:bg-gray-800/70 rounded-lg px-2.5 py-1.5 hover:bg-white dark:hover:bg-gray-800 transition"
                  >
                    {m.gameWeek && <span className="font-semibold text-gray-400">GW{m.gameWeek}</span>}
                    <span className={`font-semibold ${m.isHome ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>
                      {m.isHome ? 'H' : 'A'}
                    </span>
                    <span className="font-medium">
                      {m.opponent ? `${m.opponent.firstName} ${m.opponent.lastName}` : 'TBC'}
                    </span>
                    {m.opponent?.homeClub && <span className="text-gray-400 hidden sm:inline">{m.opponent.homeClub.name}</span>}
                    <span className="ml-auto flex items-center gap-2">
                      {m.scheduledDate && !m.outcome && (
                        <span className="text-gray-500 inline-flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          {new Date(m.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {m.venue && <span className="text-gray-400 hidden md:inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{m.venue.name}</span>}
                      {m.resultText && <span className="font-semibold">{m.resultText}</span>}
                      {m.walkoverReason && <span className="text-amber-600">walkover</span>}
                      {Icon && <Icon className={`w-3.5 h-3.5 ${m.outcome === 'WIN' ? 'text-green-600' : m.outcome === 'LOSS' ? 'text-red-500' : 'text-gray-400'}`} />}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {stage.matches.length === 0 && stage.status === 'NOT_REACHED' && (
            <p className="mt-2 text-xs text-gray-500">
              {stage.isLeague
                ? `Reach this stage by qualifying from the previous round.`
                : `Win your way through to reach ${stage.name}.`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

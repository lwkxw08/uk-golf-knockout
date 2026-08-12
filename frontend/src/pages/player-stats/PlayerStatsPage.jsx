import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Target, Award, BarChart3, ArrowUp, ArrowDown, Flame, Home, Plane, Swords } from 'lucide-react';
import AchievementsGrid from '../../components/achievements/AchievementsGrid';

export default function PlayerStatsPage() {
  const { playerId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    // If no playerId param, get current user's player ID
    if (!playerId && user) {
      api.get('/players/me').then(p => {
        if (p?.id) return api.get(`/players/${p.id}/stats`);
        throw new Error('No player profile');
      }).then(setData).catch(console.error).finally(() => setLoading(false));
    } else {
      api.get(`/players/${playerId}/stats`).then(setData).catch(console.error).finally(() => setLoading(false));
    }
  }, [playerId, user]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading stats...</div>;
  if (!data) return <div className="text-center py-12 text-gray-500">No stats available</div>;

  const { player, summary, matchHistory, holeAverages, bestHoles, worstHoles, handicapTrend } = data;
  const tabs = ['overview', 'matches', 'holes', 'trends', 'badges'];
  const isOwnPage = !playerId;

  return (
    <div>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900" />
        <div className="relative max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
              {player?.firstName?.[0]}{player?.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">{player?.firstName} {player?.lastName}</h1>
              <p className="text-green-200 text-sm">{player?.homeClub?.name}</p>
              {player?.handicapIndex && <p className="text-green-300 text-sm mt-1">Handicap Index: {Number(player.handicapIndex).toFixed(1)}</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Win Rate" value={`${summary.winRate}%`} icon={<Target className="w-5 h-5" />} color="green" />
        <StatCard label="Matches" value={summary.totalMatches} sub={`${summary.wins}W ${summary.draws}D ${summary.losses}L`} icon={<Award className="w-5 h-5" />} color="blue" />
        <StatCard label="Avg Putts" value={summary.avgPutts || '-'} icon={<BarChart3 className="w-5 h-5" />} color="purple" />
        <StatCard label="Fairway %" value={summary.fairwayPct ? `${summary.fairwayPct}%` : '-'} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Form and streak */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent form</p>
          {summary.form?.length > 0 ? (
            <div className="flex gap-1.5">
              {summary.form.map((r, i) => (
                <span key={i} title={r}
                  className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center text-white ${r === 'WIN' ? 'bg-green-600' : r === 'LOSS' ? 'bg-red-500' : 'bg-gray-400'}`}>
                  {r[0]}
                </span>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No completed matches yet</p>}
          {summary.currentStreak > 1 && (
            <p className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1">
              <Flame className={`w-3.5 h-3.5 ${summary.streakType === 'WIN' ? 'text-orange-500' : 'text-gray-400'}`} />
              {summary.currentStreak} {summary.streakType?.toLowerCase()} streak
              {summary.longestWinStreak > 1 ? ` · best run ${summary.longestWinStreak}` : ''}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Home vs away</p>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Home className="w-3.5 h-3.5" /> Home</span>
              <span className="font-semibold">{summary.homeWins}/{summary.homePlayed} {summary.homeWinRate != null ? `· ${summary.homeWinRate}%` : ''}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Plane className="w-3.5 h-3.5" /> Away</span>
              <span className="font-semibold">{summary.awayWins}/{summary.awayPlayed} {summary.awayWinRate != null ? `· ${summary.awayWinRate}%` : ''}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Matchplay edge</p>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Biggest win</span>
              <span className="font-semibold">{summary.biggestWinMargin ? `${summary.biggestWinMargin} up` : '–'}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">Went to the 18th</span>
              <span className="font-semibold">{summary.reached18} time{summary.reached18 === 1 ? '' : 's'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Win/Loss/Draw */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Match Record</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold text-green-600">{summary.wins}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Wins</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold text-gray-400">{summary.draws}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Draws</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold text-red-500">{summary.losses}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Losses</p>
              </div>
            </div>
            {summary.totalMatches > 0 && (
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div className="bg-green-500 transition-all" style={{ width: `${(summary.wins / summary.totalMatches) * 100}%` }} />
                <div className="bg-gray-300 transition-all" style={{ width: `${(summary.draws / summary.totalMatches) * 100}%` }} />
                <div className="bg-red-400 transition-all" style={{ width: `${(summary.losses / summary.totalMatches) * 100}%` }} />
              </div>
            )}
          </div>

          {/* Best/Worst Holes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Best & Worst Holes</h3>
            {bestHoles?.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium uppercase">Best (lowest avg)</p>
                {bestHoles.map(h => (
                  <div key={`best-${h.hole}`} className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <span className="font-medium text-green-800 dark:text-green-300">Hole {h.hole}</span>
                    <span className="text-sm text-green-700">Avg {h.avgScore.toFixed(1)}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-500 font-medium uppercase mt-4">Worst (highest avg)</p>
                {worstHoles?.map(h => (
                  <div key={`worst-${h.hole}`} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-red-800">Hole {h.hole}</span>
                    <span className="text-sm text-red-700">Avg {h.avgScore.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No hole data recorded yet</p>
            )}
          </div>

          {/* Avg Stableford */}
          {summary.avgStableford && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Stableford Average</h3>
              <p className="text-4xl font-bold text-green-700">{summary.avgStableford}</p>
              <p className="text-sm text-gray-500 mt-1">points per round</p>
            </div>
          )}
        </div>
      )}

      {tab === 'matches' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <div className="divide-y">
            {matchHistory?.length > 0 ? matchHistory.map((m, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${m.result === 'WIN' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : m.result === 'LOSS' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-gray-100 text-gray-600'}`}>
                      {m.result}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">vs {m.opponent?.firstName} {m.opponent?.lastName}</span>
                    {m.wasHome != null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.wasHome ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        {m.wasHome ? 'HOME' : 'AWAY'}
                      </span>
                    )}
                    {m.opponent?.id && player?.id && (
                      <Link to={`/players/${player.id}/head-to-head/${m.opponent.id}`}
                        className="text-xs text-green-700 dark:text-green-400 hover:underline inline-flex items-center gap-1">
                        <Swords className="w-3 h-3" /> H2H
                      </Link>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {m.tournament} {m.venue ? `• ${m.venue}` : ''}
                    {m.date ? ` • ${new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  {m.resultText && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{m.resultText}</p>}
                  {m.leaguePointsEarned != null && <p className="text-xs text-gray-500">{m.leaguePointsEarned} league pts</p>}
                </div>
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-gray-400">No match history yet</div>
            )}
          </div>
        </div>
      )}

      {tab === 'holes' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-900 dark:text-gray-200">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Hole</th>
                  <th className="px-4 py-3 text-center font-medium">Avg Score</th>
                  <th className="px-4 py-3 text-center font-medium">Avg Putts</th>
                  <th className="px-4 py-3 text-center font-medium">Fairway %</th>
                  <th className="px-4 py-3 text-center font-medium">Rounds</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {holeAverages?.length > 0 ? holeAverages.sort((a, b) => a.hole - b.hole).map(h => (
                  <tr key={h.hole}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Hole {h.hole}</td>
                    <td className="px-4 py-3 text-center font-semibold">{h.avgScore.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center">{h.avgPutts != null ? h.avgPutts.toFixed(1) : '-'}</td>
                    <td className="px-4 py-3 text-center">{h.fairwayPct != null ? `${h.fairwayPct.toFixed(0)}%` : '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{h.timesPlayed}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hole data recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'badges' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Achievements</h3>
          <AchievementsGrid playerId={isOwnPage ? undefined : playerId} />
        </div>
      )}

      {tab === 'trends' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Handicap Trend</h3>
          {handicapTrend?.length > 0 ? (
            <div className="space-y-2">
              {handicapTrend.map((t, i) => {
                const prev = i > 0 ? handicapTrend[i - 1].handicap : t.handicap;
                const diff = t.handicap - prev;
                return (
                  <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">{t.handicap.toFixed(1)}</p>
                        {diff !== 0 && (
                          <p className={`text-xs flex items-center gap-0.5 ${diff < 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {diff < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                            {Math.abs(diff).toFixed(1)}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <p>Gross: {t.grossScore}</p>
                        {t.stablefordPoints && <p>Stableford: {t.stablefordPoints}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No handicap data recorded yet. Submit scores via digital scorecards to build your trend.</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

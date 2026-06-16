import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function LeagueTablePage() {
  const { tournamentId } = useParams();
  const { user } = useAuth();
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures] = useState({});
  const [allMatches, setAllMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [scoringConfig, setScoringConfig] = useState(null);
  const [matchCount, setMatchCount] = useState(6);
  const [activeTab, setActiveTab] = useState('table');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawStatus, setDrawStatus] = useState(null);
  const [drawCountdown, setDrawCountdown] = useState(null);
  const [weekScheduleDates, setWeekScheduleDates] = useState({});
  const [schedulingWeek, setSchedulingWeek] = useState(null);
  const [executingWeek, setExecutingWeek] = useState(null);
  const [regeneratingWeek, setRegeneratingWeek] = useState(null);
  const [drawMsg, setDrawMsg] = useState('');

  useEffect(() => {
    if (tournamentId) loadData();
  }, [tournamentId]);

  async function loadData() {
    setLoading(true);
    try {
      const standingsData = await api.get(`/league/${tournamentId}/standings`);
      setStandings(standingsData.standings || []);
      setScoringConfig(standingsData.scoringConfig);
      setMatchCount(standingsData.matchCount || 6);
    } catch (err) { console.error('Failed to load standings:', err); }
    try {
      const fixturesData = await api.get(`/league/${tournamentId}/fixtures`);
      setFixtures(fixturesData.fixtures || {});
      setAllMatches(fixturesData.matches || []);
    } catch (err) { console.error('Failed to load fixtures:', err); }
    try {
      const tournamentData = await api.get(`/tournaments/${tournamentId}`);
      setTournament(tournamentData);
    } catch (err) { console.error('Failed to load tournament:', err); }
    try {
      const ds = await api.get(`/league/${tournamentId}/draw-status`);
      setDrawStatus(ds);
    } catch (err) { console.error('Draw status error:', err); }
    setLoading(false);
  }

  // Countdown timer — uses next scheduled week draw
  useEffect(() => {
    const nextScheduled = (drawStatus?.weekDraws || []).find(d => d.status === 'SCHEDULED');
    if (!nextScheduled?.scheduledAt) { setDrawCountdown(null); return; }
    const target = new Date(nextScheduled.scheduledAt).getTime();
    const interval = setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) { setDrawCountdown(null); clearInterval(interval); return; }
      setDrawCountdown({
        gameWeek: nextScheduled.gameWeek,
        scheduledAt: nextScheduled.scheduledAt,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [drawStatus]);

  const handleScheduleWeekDraw = async (week) => {
    const dateVal = weekScheduleDates[week];
    if (!dateVal) return;
    const leagueStage = tournament?.stages?.find(s => s.isLeague);
    if (!leagueStage) return;
    setSchedulingWeek(week); setDrawMsg('');
    try {
      await api.post(`/league/${tournamentId}/schedule-draw`, { stageId: leagueStage.id, scheduledAt: new Date(dateVal).toISOString(), gameWeek: week });
      const ds = await api.get(`/league/${tournamentId}/draw-status`);
      setDrawStatus(ds);
      setDrawMsg(`Week ${week} draw scheduled`);
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setSchedulingWeek(null); }
  };

  const handleExecuteWeekDraw = async (week) => {
    const leagueStage = tournament?.stages?.find(s => s.isLeague);
    if (!leagueStage || !confirm(`Start the live draw for Game Week ${week}?`)) return;
    setExecutingWeek(week); setDrawMsg('');
    try {
      const r = await api.post(`/league/${tournamentId}/execute-live-draw`, { stageId: leagueStage.id, gameWeek: week });
      setDrawMsg(`Week ${week} draw complete — ${r.matchCount} matches`);
      loadData();
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setExecutingWeek(null); }
  };

  const handleRegenerateWeek = async (week) => {
    const leagueStage = tournament?.stages?.find(s => s.isLeague);
    if (!leagueStage || !confirm(`Regenerate Game Week ${week}?`)) return;
    setRegeneratingWeek(week); setDrawMsg('');
    try {
      const r = await api.post(`/league/${tournamentId}/regenerate-week`, { gameWeek: week, stageId: leagueStage.id });
      setDrawMsg(`Week ${week} regenerated — ${r.matchCount} new matches`);
      loadData();
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setRegeneratingWeek(null); }
  };

  const weeks = Object.keys(fixtures).map(Number).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900" />
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <Link to="/tournaments" className="text-green-200 hover:text-white text-sm mb-3 block">← Back to Tournaments</Link>
          <h1 className="text-3xl font-extrabold text-white">{tournament?.name || 'Regional League'}</h1>
          <p className="text-green-200 mt-1">{tournament?.description}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="bg-white/15 backdrop-blur text-white px-3 py-1 rounded-lg text-sm font-medium">Regional League</span>
            <span className="text-green-200 text-sm">{matchCount} matches per player (3 home / 3 away)</span>
            <span className="text-green-200 text-sm">Top 4 qualify for National Final</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Draw Countdown — next scheduled week */}
      {drawCountdown && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6 text-center">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Game Week {drawCountdown.gameWeek} Draw Countdown</h3>
          <div className="flex justify-center gap-3 mb-3">
            {[['days','Days'],['hours','Hrs'],['minutes','Min'],['seconds','Sec']].map(([k,l]) => (
              <div key={k} className="bg-white rounded-lg px-4 py-2 min-w-[60px] shadow-sm border border-blue-100">
                <div className="text-2xl font-bold text-blue-900">{String(drawCountdown[k]).padStart(2,'0')}</div>
                <div className="text-xs text-blue-500">{l}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-blue-600">
            {new Date(drawCountdown.scheduledAt).toLocaleString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </p>
          <Link to={`/draws/${tournamentId}/live`} className="inline-flex items-center gap-2 mt-3 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            Watch Live Draw
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {['table', 'fixtures', 'scoring', 'club-points'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'table' && 'League Table'}
              {tab === 'fixtures' && 'Fixtures & Results'}
              {tab === 'scoring' && 'Scoring System'}
              {tab === 'club-points' && 'Club Championship'}
            </button>
          ))}
        </nav>
      </div>

      {/* League Table */}
      {activeTab === 'table' && (
        <LeagueTable standings={standings} matchCount={matchCount} />
      )}

      {/* Fixtures */}
      {activeTab === 'fixtures' && (
        <FixturesList fixtures={fixtures} weeks={weeks} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} />
      )}

      {/* Scoring System */}
      {activeTab === 'scoring' && (
        <ScoringSystem config={scoringConfig} />
      )}

      {/* Club Points */}
      {activeTab === 'club-points' && (
        <ClubChampionship season={tournament?.season || '2027'} />
      )}

      {/* Admin Per-Week Draw Management */}
      {user?.role === 'ADMIN' && (
        <div className="mt-8 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">League Draw Management (Admin)</h2>
          <p className="text-sm text-gray-600 mb-4">Each game week has its own independent draw. Schedule a date/time or trigger immediately.</p>
          {drawMsg && (
            <div className={`mb-4 px-4 py-2 rounded text-sm ${drawMsg.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {drawMsg}
            </div>
          )}

          <div className="space-y-3">
            {Array.from({ length: matchCount }, (_, i) => i + 1).map(week => {
              const weekDraw = (drawStatus?.weekDraws || []).find(d => d.gameWeek === week);
              const hasFixtures = drawStatus?.revealedWeeks?.includes(week);

              return (
                <div key={week} className={`border rounded-lg p-4 ${hasFixtures ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : weekDraw?.status === 'SCHEDULED' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' : 'bg-gray-50 dark:bg-gray-900 border-gray-200'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">Week {week}</span>
                      {hasFixtures && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-medium">Drawn</span>
                      )}
                      {weekDraw?.status === 'SCHEDULED' && !hasFixtures && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">
                          Scheduled: {new Date(weekDraw.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {!weekDraw && !hasFixtures && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">Not scheduled</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!hasFixtures && (
                        <>
                          <input
                            type="datetime-local"
                            value={weekScheduleDates[week] || ''}
                            onChange={e => setWeekScheduleDates(prev => ({ ...prev, [week]: e.target.value }))}
                            className="border dark:border-gray-600 rounded px-2 py-1 text-xs w-44"
                          />
                          <button
                            onClick={() => handleScheduleWeekDraw(week)}
                            disabled={schedulingWeek === week || !weekScheduleDates[week]}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {schedulingWeek === week ? '...' : 'Schedule'}
                          </button>
                          <button
                            onClick={() => handleExecuteWeekDraw(week)}
                            disabled={executingWeek === week}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            {executingWeek === week ? 'Drawing...' : 'Draw Now'}
                          </button>
                        </>
                      )}
                      {hasFixtures && (
                        <button
                          onClick={() => handleRegenerateWeek(week)}
                          disabled={regeneratingWeek === week}
                          className="flex items-center gap-1 px-3 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-50"
                        >
                          {regeneratingWeek === week ? 'Regenerating...' : 'Regenerate'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ─── LEAGUE TABLE COMPONENT ────────────────────────────────────────────────

function LeagueTable({ standings, matchCount }) {
  if (!standings.length) return <p className="text-gray-500">No standings data yet.</p>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-900 dark:text-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">#</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Player</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Club</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">P</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">W</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">D</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">L</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">Bonus</th>
              <th className="px-3 py-3 text-center font-semibold text-emerald-700 bg-emerald-50">Pts</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">+/-</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">Away W</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {standings.map((s, i) => {
              const isQualifying = s.position <= 4;
              const isRelegation = s.position > standings.length - 4;
              return (
                <tr key={s.id} className={`${isQualifying ? 'bg-emerald-50/50' : ''} hover:bg-gray-50 dark:bg-gray-900 transition-colors`}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {isQualifying && <span className="w-1 h-6 bg-emerald-500 rounded-full" />}
                      <span className={`font-bold ${isQualifying ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {s.position}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {s.player?.firstName} {s.player?.lastName}
                    </div>
                    <div className="text-xs text-gray-500">HI: {Number(s.player?.handicapIndex || 0).toFixed(1)}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">
                    {s.player?.homeClub?.name || '-'}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{s.played}</td>
                  <td className="px-3 py-3 text-center font-medium text-gray-900 dark:text-white">{s.wins}</td>
                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{s.draws}</td>
                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{s.losses}</td>
                  <td className="px-3 py-3 text-center text-amber-600 font-medium">{s.bonusPoints || 0}</td>
                  <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{s.totalPoints}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-medium ${s.holesDifferential > 0 ? 'text-emerald-600' : s.holesDifferential < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {s.holesDifferential > 0 ? '+' : ''}{s.holesDifferential}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{s.awayWins}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          Qualifies for National Final
        </div>
        <div>P = Played, W = Won, D = Drawn, L = Lost, Pts = Total Points, +/- = Holes Differential</div>
      </div>

      {/* Tie-break info */}
      <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
        Tie-break order: Points → Wins → Head-to-head → Away wins → Holes differential → Fewest holes lost → Best vs highest-ranked → Playoff
      </div>
    </div>
  );
}

// ─── FIXTURES LIST ─────────────────────────────────────────────────────────

function FixturesList({ fixtures, weeks, selectedWeek, setSelectedWeek }) {
  const displayWeeks = selectedWeek ? [selectedWeek] : weeks;

  return (
    <div>
      {/* Week selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedWeek(null)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            !selectedWeek ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Weeks
        </button>
        {weeks.map(w => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              selectedWeek === w ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>

      {/* Fixture cards */}
      {displayWeeks.map(week => {
        const weekDeadline = fixtures[week]?.[0]?.roundDeadline;
        const deadlineDate = weekDeadline ? new Date(weekDeadline) : null;
        const isOverdue = deadlineDate && deadlineDate < new Date();
        return (
        <div key={week} className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2 flex-wrap">
            Game Week {week}
            {fixtures[week]?.[0]?.status === 'COMPLETED' && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Complete</span>
            )}
            {fixtures[week]?.[0]?.status === 'SCHEDULED' && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">Upcoming</span>
            )}
            {deadlineDate && (
              <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                ⏰ Deadline: {deadlineDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {isOverdue && <span className="font-bold">(OVERDUE)</span>}
              </span>
            )}
          </h3>
          <div className="grid gap-3">
            {(fixtures[week] || []).map(match => (
              <FixtureCard key={match.id} match={match} />
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}

function FixtureCard({ match }) {
  const isCompleted = match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED';
  const isHome = match.isHomeForPlayerA;
  const playerA = match.playerA;
  const playerB = match.playerB;
  const venue = match.venueClub;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${isCompleted ? 'border-gray-200' : 'border-amber-200'}`}>
      <div className="flex items-center justify-between">
        {/* Home player */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">HOME</span>
            <span className={`font-medium ${match.winnerId === playerA?.id ? 'text-emerald-700' : 'text-gray-900'}`}>
              {playerA?.firstName} {playerA?.lastName}
            </span>
            <span className="text-xs text-gray-400">({Number(playerA?.handicapIndex || 0).toFixed(1)})</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{playerA?.homeClub?.name}</div>
          {isCompleted && match.leaguePointsA != null && (
            <div className="text-xs mt-1">
              <span className="font-semibold text-emerald-600">+{match.leaguePointsA} pts</span>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="px-4 text-center">
          {isCompleted ? (
            <div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">
                {match.result?.resultText || (match.winnerId ? `${match.holesUpMargin}&${match.holesRemainingMargin}` : 'Halved')}
              </div>
              {match.winnerId && (
                <div className="text-xs text-gray-500">
                  {match.winnerId === playerA?.id ? playerA?.lastName : playerB?.lastName} won
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-sm font-medium text-gray-400">vs</div>
              <div className="text-xs text-gray-400 mt-1">
                {match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBD'}
              </div>
            </div>
          )}
        </div>

        {/* Away player */}
        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-gray-400">({Number(playerB?.handicapIndex || 0).toFixed(1)})</span>
            <span className={`font-medium ${match.winnerId === playerB?.id ? 'text-emerald-700' : 'text-gray-900'}`}>
              {playerB?.firstName} {playerB?.lastName}
            </span>
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">AWAY</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{playerB?.homeClub?.name}</div>
          {isCompleted && match.leaguePointsB != null && (
            <div className="text-xs mt-1">
              <span className="font-semibold text-emerald-600">+{match.leaguePointsB} pts</span>
            </div>
          )}
        </div>
      </div>

      {/* Venue & schedule info */}
      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 flex flex-wrap items-center gap-3">
        {venue && (
          <span>📍 {venue.name}</span>
        )}
        {match.scheduledDate && (
          <span className="text-green-700 font-medium">
            📅 {new Date(match.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(match.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {match.roundDeadline && !isCompleted && (
          <span className="text-amber-600">
            ⏰ Deadline: {new Date(match.roundDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── SCORING SYSTEM ────────────────────────────────────────────────────────

function ScoringSystem({ config }) {
  const c = config || {
    win: 10, halved: 5, loss: 0,
    winBy3to4Bonus: 2, winBy5PlusBonus: 3,
    loseBy1Bonus: 2, loseBy2Bonus: 1,
    reached18thBonus: 1, awayWinBonus: 1, maxPerMatch: 14,
  };

  return (
    <div className="space-y-6">
      {/* Primary Points */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Points</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-emerald-700">{c.win}</div>
            <div className="text-sm text-emerald-600 font-medium mt-1">Win</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-700">{c.halved}</div>
            <div className="text-sm text-amber-600 font-medium mt-1">Halved Match</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-500">{c.loss}</div>
            <div className="text-sm text-gray-500 font-medium mt-1">Loss</div>
          </div>
        </div>
      </div>

      {/* Bonus Points */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bonus Points</h3>
        <div className="space-y-3">
          {[
            { label: 'Win by 3-4 holes', points: `+${c.winBy3to4Bonus}`, color: 'emerald' },
            { label: 'Win by 5+ holes', points: `+${c.winBy5PlusBonus}`, color: 'emerald', note: '(replaces +2)' },
            { label: 'Lose by only 1 hole', points: `+${c.loseBy1Bonus}`, color: 'blue' },
            { label: 'Lose by 2 holes', points: `+${c.loseBy2Bonus}`, color: 'blue' },
            { label: 'Match reaches 18th hole', points: `+${c.reached18thBonus} each`, color: 'purple' },
            { label: 'Away win', points: `+${c.awayWinBonus}`, color: 'orange' },
          ].map(b => (
            <div key={b.label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">{b.label}</span>
                {b.note && <span className="text-xs text-gray-400">{b.note}</span>}
              </div>
              <span className={`font-bold text-${b.color}-600`}>{b.points}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-center">
          <span className="text-sm text-emerald-700">Maximum per match: </span>
          <span className="text-lg font-bold text-emerald-800">{c.maxPerMatch} points</span>
        </div>
      </div>

      {/* Holes Differential */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Holes Differential</h3>
        <p className="text-gray-600 text-sm mb-3">Secondary ranking metric. Tracks the margin of every match result.</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { result: '4&3 win', diff: '+4' },
            { result: '2&1 win', diff: '+2' },
            { result: '1 up win', diff: '+1' },
            { result: 'Halved', diff: '0' },
          ].map(d => (
            <div key={d.result} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
              <span className="text-gray-700 dark:text-gray-300">{d.result}</span>
              <span className="font-medium text-gray-900 dark:text-white">{d.diff}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tie-Break Order */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tie-Break Order</h3>
        <ol className="space-y-2">
          {[
            'Total league points',
            'Number of wins',
            'Head-to-head result between tied players',
            'Number of away wins',
            'Total holes-up differential',
            'Fewest holes lost',
            'Best result against highest-ranked opponent',
            'Sudden-death playoff or countback from final match',
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                {i + 1}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{rule}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Example Match Points */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Example: Away Win by 4&3</h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm space-y-1">
          <div className="flex justify-between"><span>Win</span><span className="font-medium">+10</span></div>
          <div className="flex justify-between"><span>Win by 3+ holes bonus</span><span className="font-medium">+2</span></div>
          <div className="flex justify-between"><span>Away win bonus</span><span className="font-medium">+1</span></div>
          <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold">Total</span><span className="font-bold text-emerald-700">13 pts</span></div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm space-y-1 mt-3">
          <div className="text-gray-500 font-medium mb-1">Loser gets:</div>
          <div className="flex justify-between"><span>Loss</span><span>0</span></div>
          <div className="flex justify-between"><span>No close-loss bonus (4&3)</span><span>0</span></div>
          <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold">Total</span><span className="font-bold">0 pts</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── CLUB CHAMPIONSHIP ─────────────────────────────────────────────────────

function ClubChampionship({ season }) {
  const [clubPoints, setClubPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/league/club-points/${season}`)
      .then(data => { setClubPoints(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [season]);

  if (loading) return <div className="animate-pulse h-32 bg-gray-200 rounded" />;
  if (!clubPoints.length) return <p className="text-gray-500">No club championship data for {season}.</p>;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Club Points Championship {season}</h3>
        <p className="text-sm text-gray-500 mt-1">Clubs earn points based on their players' league performance. More players = more points potential.</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm text-gray-900 dark:text-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">#</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Club</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">Players</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">Matches</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">Wins</th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-700 bg-emerald-50">Total Pts</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">Qualifiers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clubPoints.map(cp => (
              <tr key={cp.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">{cp.position}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{cp.club?.name}</div>
                  <div className="text-xs text-gray-400">{cp.region?.name}</div>
                </td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{cp.playerCount}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{cp.matchesPlayed}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{cp.matchesWon}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{cp.totalPoints}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{cp.leagueQualifiers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import KnockoutBracket from '../../components/bracket/KnockoutBracket';
import { Trophy, Calendar, Users, MapPin, Award, Eye, Clock, RefreshCw, Play, Shuffle, FileText, CalendarPlus, Camera, Pencil } from 'lucide-react';
import SponsorBanner from '../../components/sponsors/SponsorBanner';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [entryError, setEntryError] = useState('');
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [activeStage, setActiveStage] = useState('CLUB_QUALIFIER');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [drawStatus, setDrawStatus] = useState(null);
  const [drawCountdown, setDrawCountdown] = useState(null);
  const [weekScheduleDates, setWeekScheduleDates] = useState({});
  const [schedulingWeek, setSchedulingWeek] = useState(null);
  const [executingWeek, setExecutingWeek] = useState(null);
  const [regeneratingWeek, setRegeneratingWeek] = useState(null);
  const [drawMsg, setDrawMsg] = useState('');
  const [leagueFixtures, setLeagueFixtures] = useState({});
  const [leagueFixtureWeek, setLeagueFixtureWeek] = useState(1);
  const [weekDeadlines, setWeekDeadlines] = useState({});
  const [settingDeadline, setSettingDeadline] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/tournaments/${id}`),
      api.get('/clubs?limit=100'),
    ]).then(([t, c]) => {
      setTournament(t);
      setClubs(c.clubs || []);
      if (t.stages?.[0]) setActiveStage(t.stages[0].stage);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const isLeague = tournament?.stages?.some(s => s.isLeague);

  useEffect(() => {
    if (!tournament) return;
    if (isLeague) {
      // Fetch league fixtures instead of bracket
      api.get(`/league/${id}/fixtures`).then(data => setLeagueFixtures(data.fixtures || {})).catch(() => setLeagueFixtures({}));
      api.get(`/league/${id}/draw-status`).then(setDrawStatus).catch(() => {});
    } else {
      api.get(`/matches/${id}/bracket?stage=${activeStage}`).then(setBracket).catch(() => setBracket(null));
    }
  }, [id, tournament, activeStage]);

  // Draw countdown timer — uses next scheduled week draw
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
    const leagueStage = tournament.stages?.find(s => s.isLeague);
    if (!leagueStage) return;
    setSchedulingWeek(week);
    setDrawMsg('');
    try {
      await api.post(`/league/${id}/schedule-draw`, { stageId: leagueStage.id, scheduledAt: new Date(dateVal).toISOString(), gameWeek: week });
      const status = await api.get(`/league/${id}/draw-status`);
      setDrawStatus(status);
      setDrawMsg(`Week ${week} draw scheduled`);
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setSchedulingWeek(null); }
  };

  const handleExecuteWeekDraw = async (week) => {
    const leagueStage = tournament.stages?.find(s => s.isLeague);
    if (!leagueStage) return;
    if (!confirm(`Start the live draw for Game Week ${week}? Fixtures will be revealed in real-time.`)) return;
    setExecutingWeek(week);
    setDrawMsg('');
    try {
      const result = await api.post(`/league/${id}/execute-live-draw`, { stageId: leagueStage.id, gameWeek: week });
      setDrawMsg(`Week ${week} draw complete — ${result.matchCount} matches`);
      const status = await api.get(`/league/${id}/draw-status`);
      setDrawStatus(status);
      api.get(`/league/${id}/fixtures`).then(data => setLeagueFixtures(data.fixtures || {})).catch(() => {});
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setExecutingWeek(null); }
  };

  const handleRegenerateWeek = async (week) => {
    const leagueStage = tournament.stages?.find(s => s.isLeague);
    if (!leagueStage) return;
    if (!confirm(`Regenerate all fixtures for Game Week ${week}? This will delete existing unplayed matches for this week.`)) return;
    setRegeneratingWeek(week);
    setDrawMsg('');
    try {
      const result = await api.post(`/league/${id}/regenerate-week`, { gameWeek: week, stageId: leagueStage.id });
      setDrawMsg(`Week ${week} regenerated — ${result.matchCount} new matches`);
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setRegeneratingWeek(null); }
  };

  const handleEnter = async (e) => {
    e.preventDefault();
    if (!selectedClub) { setEntryError('Please select a club'); return; }
    setEntering(true);
    setEntryError('');
    try {
      await api.post(`/tournaments/${id}/enter`, { clubId: selectedClub });
      const t = await api.get(`/tournaments/${id}`);
      setTournament(t);
      setShowEntryForm(false);
    } catch (err) {
      setEntryError(err.message);
    } finally {
      setEntering(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!tournament) return <div className="text-center py-12 text-gray-500">Tournament not found</div>;

  const isOpen = tournament.status === 'REGISTRATION_OPEN';
  const stageLabels = { CLUB_QUALIFIER: 'Club Qualifier', REGIONAL: 'Regional', NATIONAL_FINAL: 'National Final' };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Trophy className="w-8 h-8" /> {tournament.name}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-green-200 text-sm">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {tournament.season}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {tournament._count?.entries || 0} entries</span>
              <span className="capitalize">{tournament.formatType.replace(/_/g, ' ').toLowerCase()}</span>
              <span className="capitalize">{tournament.ageCategory.toLowerCase()}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {isOpen && user && (
              <button onClick={() => setShowEntryForm(true)} className="bg-white text-green-800 hover:bg-green-50 px-6 py-3 rounded-lg font-bold transition">
                Enter Tournament
              </button>
            )}
            <Link to={`/tournaments/${id}/programme`}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition">
              <FileText className="w-4 h-4" /> Programme
            </Link>
            <a href={`/api/calendar/tournament/${id}`} download
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition">
              <CalendarPlus className="w-4 h-4" /> Calendar
            </a>
            {user?.role === 'ADMIN' && (
              <Link to={`/admin/tournaments/${id}/edit`}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition">
                <Pencil className="w-4 h-4" /> Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {/* Info */}
        <div className="md:col-span-2 space-y-6">
          {tournament.description && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-2">About</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{tournament.description}</p>
            </div>
          )}

          {/* Stages */}
          {tournament.stages?.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">Stages & Progression</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {tournament.stages.map(s => (
                  <button key={s.stage} onClick={() => setActiveStage(s.stage)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeStage === s.stage ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {s.name}
                  </button>
                ))}
              </div>
              {tournament.stages.map(s => activeStage === s.stage && (
                <div key={s.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-gray-500">Rounds</p><p className="font-bold text-lg">{s.totalRounds}</p></div>
                    <div><p className="text-gray-500">Places Qualify</p><p className="font-bold text-lg">{s.qualifyCount}</p></div>
                    <div><p className="text-gray-500">Deadline</p><p className="font-bold text-lg">{s.matchDeadlineDays ? `${s.matchDeadlineDays} days` : 'TBD'}</p></div>
                  </div>
                  {s.stageRegions?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 mb-1">Regions:</p>
                      <div className="flex flex-wrap gap-1">{s.stageRegions.map(r => (
                        <span key={r.id} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{r.region.name}</span>
                      ))}</div>
                    </div>
                  )}
                  {s.prizes?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 mb-1">Prizes:</p>
                      <div className="space-y-1">{s.prizes.map(p => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span><Award className="w-3 h-3 inline mr-1 text-amber-500" />{p.position}{p.position === 1 ? 'st' : p.position === 2 ? 'nd' : 'rd'}: {p.description}</span>
                          {p.valuePence > 0 && <span className="text-gray-500">&pound;{(p.valuePence / 100).toFixed(0)}</span>}
                        </div>
                      ))}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bracket (knockout only) */}
          {!isLeague && bracket && bracket.totalRounds > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">Bracket — {stageLabels[activeStage] || activeStage}</h2>
              <KnockoutBracket rounds={bracket.rounds} totalRounds={bracket.totalRounds} roundLabels={bracket.roundLabels} />
            </div>
          )}

          {/* League Fixtures (league only) */}
          {isLeague && Object.keys(leagueFixtures).length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">League Fixtures</h2>
                <Link to={`/league/${id}`} className="text-green-700 hover:underline text-sm font-medium">View Full League Table →</Link>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {Object.keys(leagueFixtures).map(Number).sort((a, b) => a - b).map(week => (
                  <button
                    key={week}
                    onClick={() => setLeagueFixtureWeek(week)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      leagueFixtureWeek === week
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Week {week}
                  </button>
                ))}
              </div>
              {/* Week deadline header */}
              {(() => {
                const weekFixtures = leagueFixtures[leagueFixtureWeek] || [];
                const deadline = weekFixtures[0]?.roundDeadline;
                if (!deadline) return null;
                const deadlineDate = new Date(deadline);
                const isPast = deadlineDate < new Date();
                return (
                  <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-sm font-medium ${
                    isPast ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span>Week {leagueFixtureWeek} Deadline: {deadlineDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {isPast && <span className="ml-1 text-xs font-bold">(OVERDUE)</span>}
                  </div>
                );
              })()}
              <div className="space-y-3">
                {(leagueFixtures[leagueFixtureWeek] || []).map(match => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${match.isHomeForPlayerA !== false ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{match.isHomeForPlayerA !== false ? 'HOME' : 'AWAY'}</span>
                          <span className="font-medium">{match.playerA ? `${match.playerA.firstName} ${match.playerA.lastName}` : 'TBD'}</span>
                          {match.playerA?.handicapIndex != null && <span className="text-xs text-gray-400">({match.playerA.handicapIndex})</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{match.playerA?.homeClub?.name || ''}</div>
                      </div>
                      <div className="px-4 text-center min-w-[120px]">
                        {match.status === 'COMPLETED' ? (
                          <>
                            <div className="font-bold text-gray-900 text-sm">{match.result?.resultText || 'Completed'}</div>
                            {(match.leaguePointsA != null || match.leaguePointsB != null) && (
                              <div className="text-xs text-gray-500 mt-1">{match.leaguePointsA ?? 0} - {match.leaguePointsB ?? 0} pts</div>
                            )}
                          </>
                        ) : match.status === 'IN_PROGRESS' ? (
                          <Link to={`/match/${match.id}/live`} className="flex flex-col items-center gap-1">
                            <span className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">LIVE</span>
                            {match.currentHole && <span className="text-xs text-gray-500">Hole {match.currentHole}</span>}
                          </Link>
                        ) : (
                          <div>
                            <span className="text-xs text-gray-400 uppercase">{match.status}</span>
                            {match.scheduledDate && (
                              <div className="text-xs text-gray-500 mt-1">{new Date(match.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {match.playerB?.handicapIndex != null && <span className="text-xs text-gray-400">({match.playerB.handicapIndex})</span>}
                          <span className="font-medium">{match.playerB ? `${match.playerB.firstName} ${match.playerB.lastName}` : 'TBD'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${match.isHomeForPlayerA === false ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{match.isHomeForPlayerA === false ? 'HOME' : 'AWAY'}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{match.playerB?.homeClub?.name || ''}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {match.venueClub && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {match.venueClub.name}
                        </span>
                      )}
                      {match.scheduledDate && (
                        <span className="flex items-center gap-1 text-green-700 font-medium">
                          <Calendar className="w-3 h-3" /> {new Date(match.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(match.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {match.roundDeadline && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" /> Deadline: {new Date(match.roundDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draw Countdown (visible to all — next scheduled week draw) */}
          {isLeague && drawCountdown && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-blue-900 mb-3">Game Week {drawCountdown.gameWeek} Draw Countdown</h3>
              <div className="flex justify-center gap-3 mb-3">
                {[['days', 'Days'], ['hours', 'Hrs'], ['minutes', 'Min'], ['seconds', 'Sec']].map(([key, label]) => (
                  <div key={key} className="bg-white rounded-lg px-4 py-2 min-w-[60px] shadow-sm border border-blue-100">
                    <div className="text-2xl font-bold text-blue-900">{String(drawCountdown[key]).padStart(2, '0')}</div>
                    <div className="text-xs text-blue-500">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-blue-600">
                {new Date(drawCountdown.scheduledAt).toLocaleString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <Link to={`/draws/${id}/live`} className="inline-flex items-center gap-2 mt-3 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition">
                <Eye className="w-4 h-4" /> Watch Live Draw
              </Link>
            </div>
          )}

          {/* Admin: Per-Week Draw Management */}
          {user?.role === 'ADMIN' && isLeague && (
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-blue-600" /> League Draw Management
              </h2>
              <p className="text-sm text-gray-600 mb-4">Each game week has its own independent draw. Schedule a date/time or trigger immediately.</p>
              {drawMsg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${drawMsg.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {drawMsg}
                </div>
              )}

              <div className="space-y-3">
                {Array.from({ length: tournament?.stages?.find(s => s.isLeague)?.leagueMatchCount || 6 }, (_, i) => i + 1).map(week => {
                  const weekDraw = (drawStatus?.weekDraws || []).find(d => d.gameWeek === week);
                  const hasFixtures = drawStatus?.revealedWeeks?.includes(week);

                  return (
                    <div key={week} className={`border rounded-lg p-4 ${hasFixtures ? 'bg-green-50 border-green-200' : weekDraw?.status === 'SCHEDULED' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
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
                          {/* Schedule draw for this week */}
                          {!hasFixtures && (
                            <>
                              <input
                                type="datetime-local"
                                value={weekScheduleDates[week] || ''}
                                onChange={e => setWeekScheduleDates(prev => ({ ...prev, [week]: e.target.value }))}
                                className="border rounded px-2 py-1 text-xs w-44"
                              />
                              <button
                                onClick={() => handleScheduleWeekDraw(week)}
                                disabled={schedulingWeek === week || !weekScheduleDates[week]}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" /> {schedulingWeek === week ? '...' : 'Schedule'}
                              </button>
                              <button
                                onClick={() => handleExecuteWeekDraw(week)}
                                disabled={executingWeek === week}
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" /> {executingWeek === week ? 'Drawing...' : 'Draw Now'}
                              </button>
                            </>
                          )}
                          {hasFixtures && (
                            <button
                              onClick={() => handleRegenerateWeek(week)}
                              disabled={regeneratingWeek === week}
                              className="flex items-center gap-1 px-3 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${regeneratingWeek === week ? 'animate-spin' : ''}`} />
                              Regenerate
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

          {/* Round Deadlines (Admin) */}
          {user?.role === 'ADMIN' && isLeague && (
            <div className="bg-white border-2 border-amber-200 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" /> Round Deadlines
              </h2>
              <p className="text-sm text-gray-600 mb-4">Set a deadline for each game week. Players must arrange and play their match before this date.</p>
              <div className="space-y-3">
                {Array.from({ length: tournament?.stages?.find(s => s.isLeague)?.leagueMatchCount || 6 }, (_, i) => i + 1).map(week => {
                  // Check if fixtures exist for this week and get current deadline
                  const weekFixtures = leagueFixtures[week] || [];
                  const currentDeadline = weekFixtures[0]?.roundDeadline;

                  return (
                    <div key={week} className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-medium text-sm">Week {week}</span>
                        {currentDeadline && (
                          <span className="ml-2 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Deadline: {new Date(currentDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={weekDeadlines[week] || ''}
                          onChange={e => setWeekDeadlines(prev => ({ ...prev, [week]: e.target.value }))}
                          className="border rounded px-2 py-1 text-xs w-44"
                        />
                        <button
                          onClick={async () => {
                            if (!weekDeadlines[week]) return;
                            setSettingDeadline(week);
                            try {
                              await api.put('/live-match/admin/round-deadline', {
                                tournamentId: id,
                                roundNumber: 1,
                                gameWeek: week,
                                deadline: new Date(weekDeadlines[week]).toISOString(),
                              });
                              setDrawMsg(`Week ${week} deadline set successfully`);
                              // Refresh fixtures
                              api.get(`/league/${id}/fixtures`).then(data => setLeagueFixtures(data.fixtures || {})).catch(() => {});
                            } catch (err) {
                              setDrawMsg(`Failed to set deadline: ${err.message}`);
                            } finally {
                              setSettingDeadline(null);
                            }
                          }}
                          disabled={settingDeadline === week || !weekDeadlines[week]}
                          className="bg-amber-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                        >
                          {settingDeadline === week ? '...' : 'Set Deadline'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="font-medium capitalize">{tournament.status.replace(/_/g, ' ').toLowerCase()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Format</dt><dd className="font-medium capitalize">{tournament.formatType.replace(/_/g, ' ').toLowerCase()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Scoring</dt><dd className="font-medium capitalize">{tournament.scoringSystem.toLowerCase()}</dd></div>
              {tournament.handicapAllowancePct < 100 && <div className="flex justify-between"><dt className="text-gray-500">Handicap</dt><dd className="font-medium">{tournament.handicapAllowancePct}%</dd></div>}
              {tournament.enableLeaderboard && <div className="flex justify-between"><dt className="text-gray-500">Leaderboard</dt><dd className="font-medium text-green-700">Enabled</dd></div>}
            </dl>
          </div>

          {tournament.pricing?.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold mb-3">Entry Fee</h3>
              {tournament.pricing.filter(p => p.feeType === 'ENTRY_FEE').map(p => (
                <div key={p.id} className="text-center">
                  <p className="text-3xl font-bold text-green-700">&pound;{(p.amountPence / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                </div>
              ))}
            </div>
          )}

          {tournament.sponsors?.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold mb-3">Sponsors</h3>
              <div className="space-y-2">{tournament.sponsors.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  {s.logoUrl && <img src={s.logoUrl} alt={s.name} className="w-8 h-8 rounded object-contain" />}
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
              ))}</div>
            </div>
          )}
        </div>
      </div>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Enter {tournament.name}</h3>
            {entryError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{entryError}</div>}
            <form onSubmit={handleEnter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Your Club *</label>
                <select value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)} className="w-full border rounded-lg px-3 py-2" required>
                  <option value="">Choose club...</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {tournament.pricing?.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  Entry fee: <strong>&pound;{(tournament.pricing[0].amountPence / 100).toFixed(2)}</strong>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={entering} className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
                  {entering ? 'Entering...' : 'Confirm Entry'}
                </button>
                <button type="button" onClick={() => setShowEntryForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sponsor Banner */}
      <SponsorBanner placement="bracket" tournamentId={id} className="mt-6" />
    </div>
  );
}

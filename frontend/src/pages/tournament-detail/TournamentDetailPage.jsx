import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import KnockoutBracket from '../../components/bracket/KnockoutBracket';
import { Trophy, Calendar, Users, MapPin, Award, Eye, Clock, RefreshCw, Play, Shuffle } from 'lucide-react';

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
  const [drawScheduleDate, setDrawScheduleDate] = useState('');
  const [schedulingDraw, setSchedulingDraw] = useState(false);
  const [executingDraw, setExecutingDraw] = useState(false);
  const [regeneratingWeek, setRegeneratingWeek] = useState(null);
  const [drawMsg, setDrawMsg] = useState('');

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

  useEffect(() => {
    if (!tournament) return;
    api.get(`/matches/${id}/bracket?stage=${activeStage}`).then(setBracket).catch(() => setBracket(null));

    // Fetch league draw status
    if (tournament.stages?.some(s => s.isLeague)) {
      api.get(`/league/${id}/draw-status`).then(setDrawStatus).catch(() => {});
    }
  }, [id, tournament, activeStage]);

  // Draw countdown timer
  useEffect(() => {
    if (!drawStatus?.draw?.scheduledAt || drawStatus.status !== 'SCHEDULED') return;
    const target = new Date(drawStatus.draw.scheduledAt).getTime();
    const interval = setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) { setDrawCountdown(null); clearInterval(interval); return; }
      setDrawCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [drawStatus]);

  const handleScheduleDraw = async () => {
    if (!drawScheduleDate) return;
    const leagueStage = tournament.stages?.find(s => s.isLeague);
    if (!leagueStage) return;
    setSchedulingDraw(true);
    setDrawMsg('');
    try {
      await api.post(`/league/${id}/schedule-draw`, { stageId: leagueStage.id, scheduledAt: new Date(drawScheduleDate).toISOString() });
      const status = await api.get(`/league/${id}/draw-status`);
      setDrawStatus(status);
      setDrawMsg('Draw scheduled successfully');
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setSchedulingDraw(false); }
  };

  const handleExecuteDraw = async () => {
    const leagueStage = tournament.stages?.find(s => s.isLeague);
    if (!leagueStage) return;
    if (!confirm('Start the live draw now? All connected viewers will see fixtures revealed in real-time.')) return;
    setExecutingDraw(true);
    setDrawMsg('');
    try {
      const result = await api.post(`/league/${id}/execute-live-draw`, { stageId: leagueStage.id });
      setDrawMsg(`Draw complete — ${result.matchCount} matches generated`);
      const status = await api.get(`/league/${id}/draw-status`);
      setDrawStatus(status);
    } catch (err) { setDrawMsg('Failed: ' + err.message); }
    finally { setExecutingDraw(false); }
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
          {isOpen && user && (
            <button onClick={() => setShowEntryForm(true)} className="bg-white text-green-800 hover:bg-green-50 px-6 py-3 rounded-lg font-bold transition">
              Enter Tournament
            </button>
          )}
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

          {/* Bracket */}
          {bracket && bracket.totalRounds > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">Bracket — {stageLabels[activeStage] || activeStage}</h2>
              <KnockoutBracket rounds={bracket.rounds} totalRounds={bracket.totalRounds} roundLabels={bracket.roundLabels} />
            </div>
          )}

          {/* Draw Countdown (visible to all for league tournaments) */}
          {tournament.stages?.some(s => s.isLeague) && drawStatus?.status === 'SCHEDULED' && drawCountdown && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-blue-900 mb-3">League Draw Countdown</h3>
              <div className="flex justify-center gap-3 mb-3">
                {[['days', 'Days'], ['hours', 'Hrs'], ['minutes', 'Min'], ['seconds', 'Sec']].map(([key, label]) => (
                  <div key={key} className="bg-white rounded-lg px-4 py-2 min-w-[60px] shadow-sm border border-blue-100">
                    <div className="text-2xl font-bold text-blue-900">{String(drawCountdown[key]).padStart(2, '0')}</div>
                    <div className="text-xs text-blue-500">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-blue-600">
                {new Date(drawStatus.draw.scheduledAt).toLocaleString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <Link to={`/draws/${id}/live`} className="inline-flex items-center gap-2 mt-3 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition">
                <Eye className="w-4 h-4" /> Watch Live Draw
              </Link>
            </div>
          )}

          {/* Live Draw link (when draw completed) */}
          {tournament.stages?.some(s => s.isLeague) && drawStatus?.status === 'COMPLETED' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">League draw completed — {drawStatus.revealedWeeks?.length || 0} game weeks</span>
              </div>
              <Link to={`/draws/${id}/live`} className="text-green-700 hover:underline text-sm font-medium flex items-center gap-1">
                View Fixtures <Eye className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Admin: Draw Management */}
          {user?.role === 'ADMIN' && tournament.stages?.some(s => s.isLeague) && (
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-blue-600" /> League Draw Management
              </h2>
              {drawMsg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${drawMsg.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {drawMsg}
                </div>
              )}

              {(!drawStatus || drawStatus.status === 'NOT_SCHEDULED') && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Schedule a live draw event. Players can watch the fixtures being revealed in real-time.</p>
                  <div className="flex gap-3">
                    <input
                      type="datetime-local"
                      value={drawScheduleDate}
                      onChange={e => setDrawScheduleDate(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleScheduleDraw}
                      disabled={schedulingDraw || !drawScheduleDate}
                      className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4" /> {schedulingDraw ? 'Scheduling...' : 'Schedule Draw'}
                    </button>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-2">Or execute immediately (no countdown):</p>
                    <button
                      onClick={handleExecuteDraw}
                      disabled={executingDraw}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" /> {executingDraw ? 'Drawing...' : 'Execute Live Draw Now'}
                    </button>
                  </div>
                </div>
              )}

              {drawStatus?.status === 'SCHEDULED' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-700 font-medium">Draw scheduled for:</p>
                    <p className="text-lg font-bold text-blue-900">
                      {new Date(drawStatus.draw.scheduledAt).toLocaleString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={handleExecuteDraw}
                    disabled={executingDraw}
                    className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" /> {executingDraw ? 'Drawing live...' : 'Start Live Draw Now'}
                  </button>
                  <Link to={`/draws/${id}/live`} className="block text-center text-blue-600 hover:underline text-sm">
                    Open live draw viewer (share this link with players)
                  </Link>
                </div>
              )}

              {drawStatus?.status === 'COMPLETED' && (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700 text-center font-medium">
                    Draw completed — {drawStatus.revealedWeeks?.length || 0} game weeks generated
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Regenerate Game Week</h3>
                    <p className="text-xs text-gray-500 mb-3">Only unplayed weeks can be regenerated. Weeks with submitted results are locked.</p>
                    <div className="flex flex-wrap gap-2">
                      {(drawStatus.revealedWeeks || []).map(week => (
                        <button
                          key={week}
                          onClick={() => handleRegenerateWeek(week)}
                          disabled={regeneratingWeek === week}
                          className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${regeneratingWeek === week ? 'animate-spin' : ''}`} />
                          Week {week}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
    </div>
  );
}

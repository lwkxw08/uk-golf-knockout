import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Calendar, User, Upload, CheckCircle, XCircle, AlertTriangle, ClipboardList, Play, Radio, BarChart3, Swords, Clock, MessageCircle, QrCode, CloudSun, Gift, CalendarPlus, ExternalLink } from 'lucide-react';
import DigitalScorecard from '../../components/scoring/DigitalScorecard';

const WMO_CODES = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm',
};

function MatchWeatherTeeTime({ clubId, matchDate }) {
  const [weather, setWeather] = useState(null);
  const [teeLink, setTeeLink] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    api.get(`/weather/forecast?clubId=${clubId}`).then((d) => {
      if (d.forecast?.length) {
        const today = d.forecast[0];
        setWeather({
          desc: WMO_CODES[today.weatherCode] || 'Unknown',
          temp: today.tempMax ?? today.tempMin,
          rain: today.precipMm,
          wind: today.windMax,
        });
      }
    }).catch(() => {});
    api.get(`/tee-time/club/${clubId}${matchDate ? '?date=' + matchDate.split('T')[0] : ''}`)
      .then((d) => {
        if (d.bookingLinks?.length) setTeeLink(d.bookingLinks[0].url);
      }).catch(() => {});
  }, [clubId, matchDate]);

  if (!weather && !teeLink) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mt-1.5">
      {weather && (
        <span className="inline-flex items-center gap-1.5 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
          <CloudSun className="w-3 h-3" />
          {weather.desc} {weather.temp != null && `${weather.temp}\u00b0C`}
          {weather.rain != null && <span className="text-blue-500">💧 {weather.rain}mm</span>}
          {weather.wind != null && <span className="text-gray-500">💨 {weather.wind}km/h</span>}
        </span>
      )}
      {teeLink && (
        <a href={teeLink} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-green-700 hover:text-green-800 font-medium">
          <CalendarPlus className="w-3 h-3" /> Book Tee Time <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </div>
  );
}

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);
  const [scorecardModal, setScorecardModal] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/players/me'),
      api.get('/players/me/matches'),
    ]).then(([p, m]) => { setPlayer(p); setMatches(m); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!player) return <div className="text-center py-12 text-gray-500">Player profile not found</div>;

  const inProgressMatches = matches.filter(m => m.status === 'IN_PROGRESS');
  const upcomingMatches = matches.filter(m => ['PENDING', 'SCHEDULED'].includes(m.status));
  const needsAction = matches.filter(m =>
    m.status === 'RESULT_SUBMITTED' && m.result && m.result.submittedById !== player.id
  );
  const completedMatches = matches.filter(m => ['COMPLETED', 'RESULT_CONFIRMED'].includes(m.status));

  const startGame = async (matchId) => {
    try {
      await api.post(`/live-match/${matchId}/start`);
      const updated = await api.get('/players/me/matches');
      setMatches(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Profile Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{player.firstName} {player.lastName}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-green-200 text-sm">
                {player.homeClub && <span>Home Club: {player.homeClub.name}</span>}
                {player.handicapIndex && <span>Handicap: {Number(player.handicapIndex).toFixed(1)}</span>}
                <span>Ranking Points: {player.rankingPoints}</span>
                <span className="capitalize">Membership: {player.membershipType}</span>
              </div>
            </div>
            <Link to="/profile" className="bg-white/15 hover:bg-white/25 backdrop-blur text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Action Required */}
      {needsAction.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" /> Action Required — Confirm Results
          </h2>
          <div className="space-y-3">
            {needsAction.map(match => {
              const opponent = match.playerAId === player.id ? match.playerB : match.playerA;
              return (
                <div key={match.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-amber-100">
                  <div>
                    <p className="font-medium text-gray-900">{match.tournament.name}</p>
                    <p className="text-sm text-gray-600">vs {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'TBD'}</p>
                    <p className="text-sm text-amber-700 mt-1">Result: {match.result?.resultText}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => confirmResult(match.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Confirm
                    </button>
                    <button onClick={() => setDisputeModal(match)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Dispute
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 text-center hover:shadow-lg transition">
          <p className="text-3xl font-extrabold text-green-700 dark:text-green-400">{player.entries?.length || 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tournaments</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 text-center hover:shadow-lg transition">
          <p className="text-3xl font-extrabold text-green-700 dark:text-green-400">{completedMatches.filter(m => m.winnerId === player.id).length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Wins</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 text-center hover:shadow-lg transition">
          <p className="text-3xl font-extrabold text-green-700 dark:text-green-400">{player.rankingPoints}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ranking Points</p>
        </div>
        <Link to="/my-stats" className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 text-center hover:shadow-lg hover:border-green-300 transition group">
          <BarChart3 className="w-7 h-7 text-green-700 dark:text-green-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
          <p className="text-sm text-green-700 dark:text-green-400 font-semibold">My Stats</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <a href="/api/calendar/my-matches" download
          className="inline-flex items-center gap-1.5 bg-white border rounded-lg px-4 py-2 text-sm text-gray-700 hover:border-green-300 hover:text-green-700 transition">
          <CalendarPlus className="w-4 h-4" /> Export Calendar (.ics)
        </a>
        <Link to="/referral"
          className="inline-flex items-center gap-1.5 bg-white border rounded-lg px-4 py-2 text-sm text-gray-700 hover:border-green-300 hover:text-green-700 transition">
          <Gift className="w-4 h-4" /> Refer a Friend — Get £5 Off
        </Link>
      </div>

      {/* In Progress Matches */}
      {inProgressMatches.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
            <Radio className="w-5 h-5 animate-pulse" /> Match In Progress
          </h2>
          <div className="space-y-3">
            {inProgressMatches.map(match => {
              const opponent = match.playerAId === player.id ? match.playerB : match.playerA;
              return (
                <div key={match.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-red-100">
                  <div>
                    <p className="font-medium text-gray-900">{match.tournament.name}</p>
                    <p className="text-sm text-gray-600">vs {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'TBD'}</p>
                    {match.currentHole && <p className="text-sm text-red-600 mt-1">Currently on Hole {match.currentHole}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setScorecardModal(match)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" /> Continue Scoring
                    </button>
                    <Link to={`/match/${match.id}/live`} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm flex items-center gap-1">
                      <Radio className="w-3 h-3" /> Live View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Upcoming Matches */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Calendar className="w-5 h-5 text-green-700 dark:text-green-400" /> Upcoming Matches
          </h2>
          {upcomingMatches.length > 0 ? (
            <div className="space-y-3">
              {upcomingMatches.map(match => {
                const opponent = match.playerAId === player.id ? match.playerB : match.playerA;
                return (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{match.tournament.name}</p>
                        <p className="text-sm text-gray-600">vs {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'TBD'}</p>
                        {match.gameWeek && <p className="text-xs text-blue-600 mt-0.5">Week {match.gameWeek}</p>}
                        {match.scheduledDate && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(match.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {match.venueClub && (
                          <>
                            <p className="text-xs text-gray-400">at {match.venueClub.name}</p>
                            <MatchWeatherTeeTime clubId={match.venueClubId || match.venueClub?.id} matchDate={match.scheduledDate} />
                          </>
                        )}
                        {match.roundDeadline && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Deadline: {new Date(match.roundDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {match.scheduledDate && (
                          <button onClick={() => startGame(match.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                            <Play className="w-3 h-3" /> Start Game
                          </button>
                        )}
                        <button onClick={() => setScorecardModal(match)}
                          className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" /> Enter Scores
                        </button>
                        <button onClick={() => setScheduleModal(match)}
                          className="text-blue-600 hover:underline text-xs flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" /> Schedule
                        </button>
                        {opponent && (
                          <Link to={`/players/${player.id}/head-to-head/${opponent.id}`}
                            className="text-purple-600 hover:underline text-xs flex items-center gap-0.5">
                            <Swords className="w-3 h-3" /> H2H Record
                          </Link>
                        )}
                        <Link to={`/match/${match.id}/chat`}
                          className="text-teal-600 hover:underline text-xs flex items-center gap-0.5">
                          <MessageCircle className="w-3 h-3" /> Chat
                        </Link>
                        <Link to={`/match/${match.id}/checkin`}
                          className="text-orange-600 hover:underline text-xs flex items-center gap-0.5">
                          <QrCode className="w-3 h-3" /> Check-In
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No upcoming matches</p>
          )}
        </div>

        {/* My Tournaments */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Trophy className="w-5 h-5 text-green-700 dark:text-green-400" /> My Tournaments
          </h2>
          {player.entries?.length > 0 ? (
            <div className="space-y-3">
              {player.entries.map(entry => (
                <Link key={entry.id} to={`/tournaments/${entry.tournament.id}`}
                  className="block border rounded-lg p-4 hover:bg-gray-50 transition">
                  <p className="font-medium">{entry.tournament.name}</p>
                  <div className="flex gap-3 mt-1 text-sm text-gray-500">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      entry.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      entry.status === 'ELIMINATED' ? 'bg-red-100 text-red-700' :
                      entry.status === 'PROMOTED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{entry.status}</span>
                    <span>at {entry.club.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No tournament entries</p>
          )}
        </div>
      </div>

      {/* Match History */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <Trophy className="w-5 h-5 text-green-700 dark:text-green-400" /> Match History
        </h2>
        {completedMatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Tournament</th>
                  <th className="pb-2">Opponent</th>
                  <th className="pb-2">Result</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {completedMatches.map(match => {
                  const opponent = match.playerAId === player.id ? match.playerB : match.playerA;
                  const won = match.winnerId === player.id;
                  const halved = !match.winnerId;
                  return (
                    <tr key={match.id} className="border-b last:border-0">
                      <td className="py-2">{match.tournament.name}</td>
                      <td className="py-2">{opponent ? `${opponent.firstName} ${opponent.lastName}` : 'N/A'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${won ? 'bg-green-100 text-green-700' : halved ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                          {won ? 'Won' : halved ? 'Halved' : 'Lost'}
                        </span>
                        {match.result?.resultText && <span className="text-gray-500 ml-2">{match.result.resultText}</span>}
                      </td>
                      <td className="py-2 text-gray-500">{match.playedAt ? new Date(match.playedAt).toLocaleDateString('en-GB') : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No completed matches yet</p>
        )}
      </div>

      </div>{/* end max-w container */}

      {/* Submit Result Modal */}
      {submitModal && <SubmitResultModal match={submitModal} player={player} onClose={() => setSubmitModal(null)} onSubmitted={() => {
        setSubmitModal(null);
        api.get('/players/me/matches').then(setMatches).catch(console.error);
      }} />}

      {/* Dispute Modal */}
      {disputeModal && <DisputeModal match={disputeModal} onClose={() => setDisputeModal(null)} onDisputed={() => {
        setDisputeModal(null);
        api.get('/players/me/matches').then(setMatches).catch(console.error);
      }} />}

      {/* Digital Scorecard Modal */}
      {scorecardModal && (
        <DigitalScorecard
          match={scorecardModal}
          player={player}
          onClose={() => setScorecardModal(null)}
          onCompleted={() => {
            setScorecardModal(null);
            api.get('/players/me/matches').then(setMatches).catch(console.error);
          }}
        />
      )}

      {/* Schedule Match Modal */}
      {scheduleModal && (
        <ScheduleModal
          match={scheduleModal}
          onClose={() => setScheduleModal(null)}
          onScheduled={() => {
            setScheduleModal(null);
            api.get('/players/me/matches').then(setMatches).catch(console.error);
          }}
        />
      )}
    </div>
  );

  async function confirmResult(matchId) {
    try {
      await api.post(`/matches/${matchId}/confirm`);
      const updated = await api.get('/players/me/matches');
      setMatches(updated);
    } catch (err) {
      alert(err.message);
    }
  }
}

function SubmitResultModal({ match, player, onClose, onSubmitted }) {
  const [winnerId, setWinnerId] = useState('');
  const [resultText, setResultText] = useState('');
  const [grossScore, setGrossScore] = useState('');
  const [scorecard, setScorecard] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const opponent = match.playerAId === player.id ? match.playerB : match.playerA;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!winnerId || !resultText) { setError('Please select winner and enter result'); return; }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('winnerId', winnerId);
      formData.append('resultText', resultText);
      if (grossScore) formData.append('grossScore', grossScore);
      if (scorecard) formData.append('scorecard', scorecard);
      await api.upload(`/matches/${match.id}/result`, formData);
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">Submit Match Result</h3>
        <p className="text-sm text-gray-600 mb-4">{match.tournament.name} — vs {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'TBD'}</p>

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Winner *</label>
            <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="w-full border rounded-lg px-3 py-2" required>
              <option value="">Select winner...</option>
              <option value={player.id}>{player.firstName} {player.lastName} (Me)</option>
              {opponent && <option value={opponent.id}>{opponent.firstName} {opponent.lastName}</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Result Description *</label>
            <input type="text" value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="e.g. 3&2, 1 up, 19th hole" className="w-full border rounded-lg px-3 py-2" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gross Score (optional)</label>
            <input type="number" value={grossScore} onChange={(e) => setGrossScore(e.target.value)} placeholder="e.g. 78" className="w-full border rounded-lg px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Scorecard</label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-green-400 transition" onClick={() => fileRef.current?.click()}>
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-500">{scorecard ? scorecard.name : 'Click to upload scorecard image'}</p>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setScorecard(e.target.files[0])} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Result'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">
              Cancel
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-400 mt-3 text-center">Your opponent must confirm this result before it's final.</p>
      </div>
    </div>
  );
}

function ScheduleModal({ match, onClose, onScheduled }) {
  const [date, setDate] = useState('');
  const [venueClubId, setVenueClubId] = useState(match.venueClubId || '');
  const [clubs, setClubs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/clubs?limit=100').then(c => setClubs(c.clubs || c)).catch(() => {});
  }, []);

  const opponent = match.playerAId === match.playerB?.id ? match.playerA : match.playerB;
  const opponentName = opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Opponent';

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!date) return;
    setSubmitting(true);
    try {
      const body = { scheduledDate: new Date(date).toISOString() };
      if (venueClubId) body.venueClubId = venueClubId;
      await api.put(`/live-match/${match.id}/schedule`, body);
      onScheduled();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-2">Schedule Match</h3>
        <p className="text-sm text-gray-600 mb-4">{match.tournament?.name} — vs {opponentName}</p>
        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue (optional)</label>
            <select value={venueClubId} onChange={(e) => setVenueClubId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="">Select venue...</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
              {submitting ? 'Scheduling...' : 'Schedule Match'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DisputeModal({ match, onClose, onDisputed }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDispute = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/matches/${match.id}/dispute`, { reason });
      onDisputed();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">Dispute Match Result</h3>
        <form onSubmit={handleDispute} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Dispute *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2" required placeholder="Explain why you disagree with the submitted result..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

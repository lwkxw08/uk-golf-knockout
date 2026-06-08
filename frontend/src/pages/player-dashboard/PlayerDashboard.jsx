import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Calendar, User, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);

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

  const upcomingMatches = matches.filter(m => ['PENDING', 'SCHEDULED'].includes(m.status));
  const needsAction = matches.filter(m =>
    m.status === 'RESULT_SUBMITTED' && m.result && m.result.submittedById !== player.id
  );
  const completedMatches = matches.filter(m => ['COMPLETED', 'RESULT_CONFIRMED'].includes(m.status));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{player.firstName} {player.lastName}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-green-200 text-sm">
              {player.homeClub && <span>Home Club: {player.homeClub.name}</span>}
              {player.handicapIndex && <span>Handicap: {Number(player.handicapIndex).toFixed(1)}</span>}
              <span>Ranking Points: {player.rankingPoints}</span>
              <span className="capitalize">Membership: {player.membershipType}</span>
            </div>
          </div>
          <Link to="/dashboard/profile" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition">
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Action Required */}
      {needsAction.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
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

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Stats */}
        <div className="bg-white border rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-green-700">{player.entries?.length || 0}</p>
          <p className="text-sm text-gray-500">Tournaments</p>
        </div>
        <div className="bg-white border rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-green-700">{completedMatches.filter(m => m.winnerId === player.id).length}</p>
          <p className="text-sm text-gray-500">Wins</p>
        </div>
        <div className="bg-white border rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-green-700">{player.rankingPoints}</p>
          <p className="text-sm text-gray-500">Ranking Points</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Upcoming Matches */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-700" /> Upcoming Matches
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
                        {match.scheduledDate && (
                          <p className="text-xs text-gray-400 mt-1">{new Date(match.scheduledDate).toLocaleDateString('en-GB')}</p>
                        )}
                        {match.venueClub && <p className="text-xs text-gray-400">at {match.venueClub.name}</p>}
                      </div>
                      <button onClick={() => setSubmitModal(match)}
                        className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                        Submit Result
                      </button>
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
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-700" /> My Tournaments
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
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-green-700" /> Match History
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
                  return (
                    <tr key={match.id} className="border-b last:border-0">
                      <td className="py-2">{match.tournament.name}</td>
                      <td className="py-2">{opponent ? `${opponent.firstName} ${opponent.lastName}` : 'N/A'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {won ? 'Won' : 'Lost'}
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

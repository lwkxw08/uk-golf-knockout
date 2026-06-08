import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import KnockoutBracket from '../../components/bracket/KnockoutBracket';
import { Trophy, Calendar, Users, MapPin, Award } from 'lucide-react';

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
  }, [id, tournament, activeStage]);

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

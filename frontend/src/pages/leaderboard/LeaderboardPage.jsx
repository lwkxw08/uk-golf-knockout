import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { BarChart3, Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard');

  useEffect(() => {
    api.get('/tournaments?limit=50').then(data => setTournaments(data.tournaments || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = selectedTournament ? `?tournamentId=${selectedTournament}` : '';
    api.get(`/players/leaderboard${params}`).then(setLeaderboard).catch(console.error).finally(() => setLoading(false));
  }, [selectedTournament]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-6"><BarChart3 className="w-8 h-8 text-green-700" /> Overall Leaderboard</h1>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="flex bg-gray-100 rounded-lg">
          <button onClick={() => setTab('leaderboard')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'leaderboard' ? 'bg-green-700 text-white' : 'text-gray-600'}`}>Adjusted Scores</button>
          <button onClick={() => setTab('rankings')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'rankings' ? 'bg-green-700 text-white' : 'text-gray-600'}`}>Rankings</button>
        </div>

        {tab === 'leaderboard' && (
          <select value={selectedTournament} onChange={(e) => setSelectedTournament(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Tournaments</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {tab === 'leaderboard' && <AdjustedLeaderboard data={leaderboard} loading={loading} />}
      {tab === 'rankings' && <RankingsTable />}
    </div>
  );
}

function AdjustedLeaderboard({ data, loading }) {
  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!data || !data.leaderboard?.length) {
    return (
      <div className="text-center py-16 text-gray-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No scores recorded yet</p>
        <p className="text-sm mt-1">Leaderboard scores appear when match results include gross scores for tournaments with the leaderboard enabled.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b">
          <th className="text-left px-4 py-3">Pos</th>
          <th className="text-left px-4 py-3">Player</th>
          <th className="text-left px-4 py-3">Club</th>
          <th className="text-left px-4 py-3">Gross</th>
          <th className="text-left px-4 py-3">Handicap</th>
          <th className="text-left px-4 py-3">Net</th>
          <th className="text-left px-4 py-3">Adj. Score</th>
          <th className="text-left px-4 py-3">Stage</th>
        </tr></thead>
        <tbody>
          {data.leaderboard.map((s, i) => (
            <tr key={s.id} className={`border-b last:border-0 ${i < 3 ? 'bg-green-50' : ''}`}>
              <td className="px-4 py-3">
                {i === 0 ? <Trophy className="w-5 h-5 text-amber-500 inline" /> :
                 i === 1 ? <Trophy className="w-5 h-5 text-gray-400 inline" /> :
                 i === 2 ? <Trophy className="w-5 h-5 text-amber-700 inline" /> :
                 <span className="font-bold text-gray-400">{i + 1}</span>}
              </td>
              <td className="px-4 py-3 font-medium">{s.player.firstName} {s.player.lastName}</td>
              <td className="px-4 py-3 text-gray-600">{s.player.homeClub?.name || s.club?.name}</td>
              <td className="px-4 py-3">{s.grossScore}</td>
              <td className="px-4 py-3">{Number(s.handicapAtPlay).toFixed(1)}</td>
              <td className="px-4 py-3">{Number(s.netScore).toFixed(1)}</td>
              <td className="px-4 py-3 font-bold text-green-700">{Number(s.adjustedScore).toFixed(1)}</td>
              <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{(s.stage || '').replace(/_/g, ' ').toLowerCase()}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankingsTable() {
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/players/rankings').then(setRankings).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!rankings?.players?.length) {
    return <div className="text-center py-16 text-gray-500"><p>No ranked players yet</p></div>;
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b">
          <th className="text-left px-4 py-3">#</th>
          <th className="text-left px-4 py-3">Player</th>
          <th className="text-left px-4 py-3">Club</th>
          <th className="text-left px-4 py-3">Handicap</th>
          <th className="text-left px-4 py-3">Points</th>
        </tr></thead>
        <tbody>{rankings.players.map((p, i) => (
          <tr key={p.id} className={`border-b last:border-0 ${i < 3 ? 'bg-green-50' : ''}`}>
            <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
            <td className="px-4 py-3 font-medium">{p.firstName} {p.lastName}</td>
            <td className="px-4 py-3 text-gray-600">{p.homeClub?.name || '-'}</td>
            <td className="px-4 py-3">{p.handicapIndex ? Number(p.handicapIndex).toFixed(1) : '-'}</td>
            <td className="px-4 py-3 font-bold text-green-700">{p.rankingPoints}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { BarChart3, Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [leagueStandings, setLeagueStandings] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard');
  const [isLeague, setIsLeague] = useState(false);

  useEffect(() => {
    api.get('/tournaments?limit=50').then(data => setTournaments(data.tournaments || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setLeagueStandings(null);
    setLeaderboard(null);

    // Check if selected tournament is a league
    const tournament = tournaments.find(t => t.id === selectedTournament);
    const tournamentIsLeague = tournament?.stages?.some(s => s.isLeague) ||
      tournament?.description?.includes('league') ||
      tournament?.description?.includes('Regional league');

    if (selectedTournament && tournamentIsLeague) {
      setIsLeague(true);
      api.get(`/league/${selectedTournament}/standings`)
        .then(data => setLeagueStandings(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setIsLeague(false);
      const params = selectedTournament ? `?tournamentId=${selectedTournament}` : '';
      api.get(`/players/leaderboard${params}`)
        .then(setLeaderboard)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedTournament, tournaments]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-6"><BarChart3 className="w-8 h-8 text-green-700" /> Overall Leaderboard</h1>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        {!isLeague && (
          <div className="flex bg-gray-100 rounded-lg">
            <button onClick={() => setTab('leaderboard')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'leaderboard' ? 'bg-green-700 text-white' : 'text-gray-600'}`}>Adjusted Scores</button>
            <button onClick={() => setTab('rankings')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'rankings' ? 'bg-green-700 text-white' : 'text-gray-600'}`}>Rankings</button>
          </div>
        )}

        <select value={selectedTournament} onChange={(e) => setSelectedTournament(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Tournaments</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {isLeague ? (
        <LeagueLeaderboard data={leagueStandings} loading={loading} tournamentId={selectedTournament} />
      ) : (
        <>
          {tab === 'leaderboard' && <AdjustedLeaderboard data={leaderboard} loading={loading} />}
          {tab === 'rankings' && <RankingsTable />}
        </>
      )}
    </div>
  );
}

function LeagueLeaderboard({ data, loading, tournamentId }) {
  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!data || !data.standings?.length) {
    return (
      <div className="text-center py-16 text-gray-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No league standings yet</p>
        <p className="text-sm mt-1">Standings appear once the league draw has been made and matches are underway.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">League Standings</span>
          <span className="text-sm text-gray-500">{data.standings.length} players • {data.matchCount || 6} matches per player</span>
        </div>
        <Link to={`/league/${tournamentId}`} className="text-emerald-600 hover:underline text-sm font-medium">
          View Full League Table →
        </Link>
      </div>
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Player</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Club</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">P</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">W</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">D</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">L</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">Bonus</th>
            <th className="text-center px-4 py-3 font-semibold text-emerald-700 bg-emerald-50">Pts</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">+/-</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-600">Away W</th>
          </tr></thead>
          <tbody>
            {data.standings.map((s, i) => {
              const isQualifying = s.position <= 4;
              return (
                <tr key={s.id} className={`border-b last:border-0 ${isQualifying ? 'bg-emerald-50/50' : ''} hover:bg-gray-50`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {isQualifying && <span className="w-1 h-5 bg-emerald-500 rounded-full" />}
                      {i === 0 ? <Trophy className="w-5 h-5 text-amber-500" /> :
                       i === 1 ? <Trophy className="w-5 h-5 text-gray-400" /> :
                       i === 2 ? <Trophy className="w-5 h-5 text-amber-700" /> :
                       <span className={`font-bold ${isQualifying ? 'text-emerald-700' : 'text-gray-400'}`}>{s.position}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.player?.firstName} {s.player?.lastName}</div>
                    <div className="text-xs text-gray-500">HI: {Number(s.player?.handicapIndex || 0).toFixed(1)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.player?.homeClub?.name || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{s.played}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-900">{s.wins}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{s.draws}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{s.losses}</td>
                  <td className="px-4 py-3 text-center text-amber-600 font-medium">{s.bonusPoints || 0}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{s.totalPoints}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${s.holesDifferential > 0 ? 'text-emerald-600' : s.holesDifferential < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {s.holesDifferential > 0 ? '+' : ''}{s.holesDifferential}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{s.awayWins}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          Top 4 qualify for National Final
        </div>
        <div>Tie-break: Points → Wins → H2H → Away wins → Holes diff → Fewest holes lost</div>
      </div>
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

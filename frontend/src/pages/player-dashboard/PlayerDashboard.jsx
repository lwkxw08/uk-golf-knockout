import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, User, Target, Calendar } from 'lucide-react';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/players/me'),
      api.get('/players/me/matches'),
    ]).then(([p, m]) => {
      setPlayer(p);
      setMatches(m);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Player Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Profile card */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{player?.firstName} {player?.lastName}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Home Club</span>
              <span className="font-medium">{player?.homeClub?.name || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Handicap</span>
              <span className="font-medium">{player?.handicapIndex ? Number(player.handicapIndex).toFixed(1) : 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">WHS ID</span>
              <span className="font-medium">{player?.whsHandicapId || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ranking Points</span>
              <span className="font-medium">{player?.rankingPoints || 0}</span>
            </div>
          </div>

          <Link to="/profile/edit"
            className="block mt-4 text-center bg-green-700 hover:bg-green-800 text-white py-2 rounded-lg text-sm font-medium transition">
            Edit Profile
          </Link>
        </div>

        {/* Stats */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-700" /> My Tournaments
          </h2>
          <div className="space-y-3">
            {player?.entries?.length ? (
              player.entries.slice(0, 5).map((entry) => (
                <Link key={entry.id} to={`/tournaments/${entry.tournament.id}`}
                  className="block border rounded-lg p-3 hover:bg-gray-50 transition">
                  <p className="font-medium text-sm">{entry.tournament.name}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{entry.club.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      entry.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      entry.status === 'ELIMINATED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{entry.status}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No tournament entries yet</p>
            )}
          </div>
        </div>

        {/* Upcoming matches */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-700" /> Upcoming Matches
          </h2>
          <div className="space-y-3">
            {matches.filter(m => ['PENDING', 'SCHEDULED'].includes(m.status)).slice(0, 5).map((match) => {
              const opponent = match.playerAId === player?.id ? match.playerB : match.playerA;
              return (
                <div key={match.id} className="border rounded-lg p-3">
                  <p className="text-sm font-medium">{match.tournament.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    vs {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'TBD'}
                  </p>
                  {match.venueClub && (
                    <p className="text-xs text-gray-400 mt-1">at {match.venueClub.name}</p>
                  )}
                </div>
              );
            })}
            {matches.filter(m => ['PENDING', 'SCHEDULED'].includes(m.status)).length === 0 && (
              <p className="text-gray-500 text-sm">No upcoming matches</p>
            )}
          </div>
        </div>
      </div>

      {/* Match history */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-green-700" /> Match History
        </h2>
        {matches.filter(m => ['COMPLETED', 'RESULT_CONFIRMED'].includes(m.status)).length > 0 ? (
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
                {matches.filter(m => ['COMPLETED', 'RESULT_CONFIRMED'].includes(m.status)).map((match) => {
                  const opponent = match.playerAId === player?.id ? match.playerB : match.playerA;
                  const won = match.winnerId === player?.id;
                  return (
                    <tr key={match.id} className="border-b last:border-0">
                      <td className="py-2">{match.tournament.name}</td>
                      <td className="py-2">{opponent ? `${opponent.firstName} ${opponent.lastName}` : 'N/A'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {won ? 'Won' : 'Lost'}
                        </span>
                        {match.result?.resultText && (
                          <span className="text-gray-500 ml-2">{match.result.resultText}</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-500">
                        {match.playedAt ? new Date(match.playedAt).toLocaleDateString('en-GB') : '-'}
                      </td>
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
    </div>
  );
}

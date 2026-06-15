import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Swords, Trophy, Calendar, MapPin } from 'lucide-react';

export default function HeadToHeadPage() {
  const { playerId, opponentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId || !opponentId) return;
    api.get(`/players/${playerId}/head-to-head/${opponentId}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [playerId, opponentId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!data) return <div className="text-center py-12 text-gray-500">No head-to-head data available</div>;

  const { player, opponent, summary, matchDetails, holeAnalysis } = data;

  return (
    <div>
      {/* H2H Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900" />
        <div className="relative max-w-4xl mx-auto px-4 py-10 text-white">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Swords className="w-5 h-5" />
          <h1 className="text-lg font-medium">Head-to-Head Record</h1>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
              {player?.firstName?.[0]}{player?.lastName?.[0]}
            </div>
            <p className="font-bold text-lg">{player?.firstName} {player?.lastName}</p>
            <p className="text-blue-200 text-sm">{player?.homeClub?.name}</p>
          </div>

          <div className="text-center px-8">
            <div className="flex items-center gap-4 text-4xl font-bold">
              <span className="text-green-400">{summary.playerWins}</span>
              <span className="text-white/40">-</span>
              <span className={summary.halved > 0 ? 'text-white/60' : 'hidden'}>{summary.halved}</span>
              {summary.halved > 0 && <span className="text-white/40">-</span>}
              <span className="text-red-400">{summary.opponentWins}</span>
            </div>
            <p className="text-sm text-blue-200 mt-2">
              {summary.totalMatches} match{summary.totalMatches !== 1 ? 'es' : ''} played
            </p>
            {summary.avgMargin != 0 && (
              <p className="text-xs text-blue-300 mt-1">
                Avg margin: {Number(summary.avgMargin) > 0 ? '+' : ''}{summary.avgMargin} holes
              </p>
            )}
          </div>

          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
              {opponent?.firstName?.[0]}{opponent?.lastName?.[0]}
            </div>
            <p className="font-bold text-lg">{opponent?.firstName} {opponent?.lastName}</p>
            <p className="text-blue-200 text-sm">{opponent?.homeClub?.name}</p>
          </div>
        </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Match History */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Match History</h2>
        </div>
        <div className="divide-y">
          {matchDetails?.length > 0 ? matchDetails.map((m, i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {m.winner === 'player' && <Trophy className="w-5 h-5 text-green-500" />}
                  {m.winner === 'opponent' && <Trophy className="w-5 h-5 text-red-400" />}
                  {m.winner === 'halved' && <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold text-sm">=</span>}
                  <div>
                    <p className="font-medium text-gray-900">{m.resultText || 'Result pending'}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                      {m.tournament && <span>{m.tournament}</span>}
                      {m.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.venue}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${m.winner === 'player' ? 'bg-green-100 text-green-700' : m.winner === 'opponent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.winner === 'player' ? 'WON' : m.winner === 'opponent' ? 'LOST' : 'HALVED'}
                  </span>
                  {m.date && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="px-6 py-8 text-center text-gray-400">No matches played yet</div>
          )}
        </div>
      </div>

      {/* Hole-by-Hole Analysis */}
      {holeAnalysis?.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">Hole-by-Hole Analysis</h2>
            <p className="text-sm text-gray-500">Which holes does each player tend to win?</p>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {holeAnalysis.map(h => {
                const total = h.player + h.opponent + h.halved;
                const pPct = total > 0 ? (h.player / total * 100) : 0;
                const oPct = total > 0 ? (h.opponent / total * 100) : 0;
                return (
                  <div key={h.hole} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-12">Hole {h.hole}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 transition-all flex items-center justify-center" style={{ width: `${pPct}%` }}>
                        {pPct > 15 && <span className="text-white text-xs font-bold">{h.player}</span>}
                      </div>
                      <div className="bg-gray-300 transition-all" style={{ width: `${100 - pPct - oPct}%` }} />
                      <div className="bg-red-400 transition-all flex items-center justify-center" style={{ width: `${oPct}%` }}>
                        {oPct > 15 && <span className="text-white text-xs font-bold">{h.opponent}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> {player?.firstName}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 rounded" /> Halved</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded" /> {opponent?.firstName}</span>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

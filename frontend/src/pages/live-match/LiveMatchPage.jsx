import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Radio, Share2, Users, Clock, MapPin, ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import SponsorBanner from '../../components/sponsors/SponsorBanner';
import io from 'socket.io-client';

export default function LiveMatchPage() {
  const { matchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/live-match/${matchId}/live`)
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('match:join', matchId);

    socket.on('match:started', (evt) => {
      setLiveUpdates(prev => [{ type: 'started', ...evt, time: new Date() }, ...prev]);
      setData(prev => prev ? { ...prev, match: { ...prev.match, status: 'IN_PROGRESS', matchStartedAt: evt.startedAt } } : prev);
    });

    socket.on('match:hole-update', (evt) => {
      setLiveUpdates(prev => [{ type: 'hole', ...evt, time: new Date() }, ...prev]);
      setData(prev => {
        if (!prev) return prev;
        const newScores = { ...prev.scoresByHole };
        newScores[evt.holeNumber] = {};
        for (const [pid, score] of Object.entries(evt.scores)) {
          newScores[evt.holeNumber][pid] = { score };
        }
        // Recalculate match state
        let playerAUp = 0, holesPlayed = 0;
        for (let h = 1; h <= 18; h++) {
          const hole = newScores[h];
          if (!hole || !hole[prev.playerA?.id] || !hole[prev.playerB?.id]) continue;
          holesPlayed++;
          const a = hole[prev.playerA.id].score;
          const b = hole[prev.playerB.id].score;
          if (a < b) playerAUp++;
          else if (b < a) playerAUp--;
        }
        return {
          ...prev,
          scoresByHole: newScores,
          match: { ...prev.match, currentHole: evt.currentHole },
          matchState: {
            holesPlayed,
            playerAUp,
            matchStatus: playerAUp > 0 ? `${prev.playerA?.firstName} ${playerAUp} UP` :
                         playerAUp < 0 ? `${prev.playerB?.firstName} ${Math.abs(playerAUp)} UP` :
                         'ALL SQUARE',
          },
        };
      });
    });

    socket.on('match:ended', () => {
      setLiveUpdates(prev => [{ type: 'ended', time: new Date() }, ...prev]);
    });

    return () => {
      socket.emit('match:leave', matchId);
      socket.disconnect();
    };
  }, [matchId]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading match...</div>;
  if (error || !data) return <div className="text-center py-12 text-red-500">{error || 'Match not found'}</div>;

  const { match, playerA, playerB, tournament, venue, scoresByHole, matchState } = data;
  const isLive = match.status === 'IN_PROGRESS';

  return (
    <div>
      {/* Match Header */}
      <div className={`relative overflow-hidden ${isLive ? '' : ''}`}>
        <div className={`absolute inset-0 ${isLive ? 'bg-gradient-to-br from-red-900 via-red-800 to-red-900' : 'bg-gradient-to-br from-green-900 via-green-800 to-emerald-900'}`} />
        <div className="relative max-w-4xl mx-auto px-4 py-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            )}
            <span className="text-sm opacity-80">{tournament?.name}</span>
            {match.gameWeek && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Week {match.gameWeek}</span>}
          </div>
          <button onClick={copyShareLink} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm transition">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        {/* Players */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
              {playerA?.firstName?.[0]}{playerA?.lastName?.[0]}
            </div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{playerA?.firstName} {playerA?.lastName}</p>
            <p className="text-sm opacity-70">{playerA?.homeClub?.name}</p>
            {playerA?.handicapIndex && <p className="text-xs opacity-60">HI: {Number(playerA.handicapIndex).toFixed(1)}</p>}
          </div>

          <div className="text-center px-6">
            <p className="text-3xl font-bold mb-1">
              {matchState?.matchStatus || 'vs'}
            </p>
            <p className="text-sm opacity-70">
              {matchState?.holesPlayed > 0 ? `Thru ${matchState.holesPlayed}` : 'Not started'}
            </p>
          </div>

          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
              {playerB?.firstName?.[0]}{playerB?.lastName?.[0]}
            </div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{playerB?.firstName} {playerB?.lastName}</p>
            <p className="text-sm opacity-70">{playerB?.homeClub?.name}</p>
            {playerB?.handicapIndex && <p className="text-xs opacity-60">HI: {Number(playerB.handicapIndex).toFixed(1)}</p>}
          </div>
        </div>

        {/* Venue & Time */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm opacity-70">
          {venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {venue.name}</span>}
          {match.scheduledDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(match.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hole-by-Hole Scorecard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Hole-by-Hole Scores</h2>
          {isLive && match.currentHole && (
            <span className="text-sm text-red-600 font-medium">Playing Hole {match.currentHole}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-900 dark:text-gray-200">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500">
                <th className="px-3 py-2 text-left font-medium">Hole</th>
                {Array.from({ length: 18 }, (_, i) => (
                  <th key={i + 1} className={`px-2 py-2 text-center font-medium min-w-[36px] ${match.currentHole === i + 1 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : ''}`}>
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[playerA, playerB].map((p, idx) => (
                <tr key={p?.id || idx} className={idx === 0 ? 'border-b' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                    {p?.firstName?.[0]}. {p?.lastName}
                  </td>
                  {Array.from({ length: 18 }, (_, i) => {
                    const holeData = scoresByHole?.[i + 1]?.[p?.id];
                    const score = holeData?.score;
                    const isCurrentHole = match.currentHole === i + 1;
                    return (
                      <td key={i + 1} className={`px-2 py-2 text-center ${isCurrentHole ? 'bg-red-50' : ''}`}>
                        {score != null ? (
                          <span className="font-semibold">{score}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Hole result row */}
              <tr className="border-t bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">
                <td className="px-3 py-2 font-medium text-gray-500 text-xs">Result</td>
                {Array.from({ length: 18 }, (_, i) => {
                  const hole = scoresByHole?.[i + 1];
                  if (!hole || !playerA?.id || !playerB?.id || !hole[playerA.id] || !hole[playerB.id]) {
                    return <td key={i + 1} className="px-2 py-2 text-center text-gray-300 text-xs">-</td>;
                  }
                  const a = hole[playerA.id].score;
                  const b = hole[playerB.id].score;
                  let cls = 'text-gray-400';
                  let txt = 'H';
                  if (a < b) { cls = 'text-green-600 font-bold'; txt = playerA.firstName[0]; }
                  else if (b < a) { cls = 'text-blue-600 font-bold'; txt = playerB.firstName[0]; }
                  return <td key={i + 1} className={`px-2 py-2 text-center text-xs ${cls}`}>{txt}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Activity Feed */}
      {liveUpdates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" /> Live Updates
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {liveUpdates.map((u, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 text-xs mt-0.5 whitespace-nowrap">
                  {new Date(u.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div>
                  {u.type === 'started' && <p className="text-green-700 font-medium">Match started!</p>}
                  {u.type === 'ended' && <p className="text-red-700 font-medium">Match ended</p>}
                  {u.type === 'hole' && (
                    <p className="text-gray-700 dark:text-gray-300">
                      Hole {u.holeNumber} completed
                      {u.holeResult && <span className="font-medium"> — {u.holeResult}</span>}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Match Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Tournament</p>
            <p className="font-medium">{tournament?.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Format</p>
            <p className="font-medium">{tournament?.formatType?.replace(/_/g, ' ')}</p>
          </div>
          {match.gameWeek && (
            <div>
              <p className="text-gray-500">Game Week</p>
              <p className="font-medium">Week {match.gameWeek}</p>
            </div>
          )}
          {match.roundDeadline && (
            <div>
              <p className="text-gray-500">Deadline</p>
              <p className="font-medium">{new Date(match.roundDeadline).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Status</p>
            <p className={`font-medium ${isLive ? 'text-red-600' : 'text-gray-900'}`}>
              {match.status?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Share this page so friends and family can follow along live</span>
          </div>
          <a href={`/api/calendar/match/${matchId}`} download
            className="flex items-center gap-1 text-green-600 hover:text-green-700 text-xs">
            <CalendarPlus className="w-3.5 h-3.5" /> Add to Calendar
          </a>
        </div>
      </div>

      {/* Sponsor Banner */}
      <SponsorBanner placement="match_page" tournamentId={match.tournamentId} matchId={matchId} className="mt-4" />
      </div>
    </div>
  );
}

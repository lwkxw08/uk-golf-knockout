import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { Radio, Eye, MapPin, Trophy, Share2 } from 'lucide-react';
import { api } from '../../api/client';

export default function SpectatePage() {
  const { shareToken } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/spectate/${shareToken}`).then(setData).catch((err) => setError(err.message));
  }, [shareToken]);

  useEffect(() => {
    if (!data?.match?.id) return undefined;
    const matchId = data.match.id;
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('match:join', matchId);

    const refresh = () => api.get(`/spectate/${shareToken}`).then(setData).catch(() => {});
    socket.on('match:hole-update', refresh);
    socket.on('match:started', refresh);
    socket.on('match:ended', refresh);

    return () => {
      socket.emit('match:leave', matchId);
      socket.disconnect();
    };
  }, [data?.match?.id, shareToken]);

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <Link to="/tournaments" className="text-green-700 dark:text-green-400 text-sm hover:underline mt-3 inline-block">Browse tournaments</Link>
      </div>
    );
  }
  if (!data) return <div className="text-center py-20 text-gray-500">Loading match…</div>;

  const { match, playerA, playerB, tournament, venue, scoresByHole, holesPlayed, summary, spectatorViews } = data;
  const isLive = match.status === 'IN_PROGRESS';
  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div>
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 ${isLive ? 'bg-gradient-to-br from-red-900 via-red-800 to-red-900' : 'bg-gradient-to-br from-green-900 via-green-800 to-emerald-900'}`} />
        <div className="relative max-w-4xl mx-auto px-4 py-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              {isLive ? (
                <span className="flex items-center gap-1 bg-red-500 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                  <Radio className="w-3 h-3" /> LIVE
                </span>
              ) : (
                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                  {match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED' ? 'FULL TIME' : 'NOT STARTED'}
                </span>
              )}
              <span className="text-sm opacity-80">{tournament?.name}</span>
              {match.gameWeek && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Week {match.gameWeek}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs opacity-80"><Eye className="w-3.5 h-3.5" /> {spectatorViews}</span>
              <button onClick={share} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm transition">
                <Share2 className="w-4 h-4" /> {copied ? 'Link copied' : 'Share'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {[playerA, playerB].map((p, i) => (
              <div key={p?.id || i} className="text-center flex-1">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                  {p?.firstName?.[0]}{p?.lastName?.[0]}
                </div>
                <p className="font-bold text-lg">{p?.firstName} {p?.lastName}</p>
                <p className="text-sm opacity-70">{p?.homeClub?.name}</p>
                {p?.handicapIndex != null && <p className="text-xs opacity-60">HI: {Number(p.handicapIndex).toFixed(1)}</p>}
                {match.winnerId === p?.id && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-yellow-300"><Trophy className="w-3 h-3" /> Winner</p>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <p className="text-3xl font-extrabold">{match.resultText || summary}</p>
            <p className="text-xs opacity-70 mt-1">
              {holesPlayed} hole{holesPlayed === 1 ? '' : 's'} played
              {venue ? ` · ` : ''}
              {venue && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{venue.name}</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500">
                <th className="text-left px-3 py-2">Hole</th>
                {holes.map((h) => <th key={h} className="px-1.5 py-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[playerA, playerB].map((p) => (
                <tr key={p?.id} className="border-t dark:border-gray-700">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{p?.firstName} {p?.lastName?.[0]}.</td>
                  {holes.map((h) => {
                    const mine = scoresByHole?.[h]?.[p?.id]?.score;
                    const other = scoresByHole?.[h]?.[(p?.id === playerA?.id ? playerB : playerA)?.id]?.score;
                    const won = mine != null && other != null && mine < other;
                    return (
                      <td key={h} className={`px-1.5 py-2 text-center ${won ? 'font-bold text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {mine ?? '–'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Live matchplay scoring from Luna Golf. <Link to="/tournaments" className="text-green-700 dark:text-green-400 hover:underline">Find a tournament near you</Link>.
        </p>
      </div>
    </div>
  );
}

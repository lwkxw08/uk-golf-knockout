import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../../api/client';
import { Eye, Clock, Trophy } from 'lucide-react';

export default function LiveDrawPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [draw, setDraw] = useState(null);
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState('waiting'); // waiting | live | complete
  const [viewerCount, setViewerCount] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/tournaments/${tournamentId}`).then(setTournament).catch(console.error);

    api.get(`/draws/${tournamentId}`).then((draws) => {
      const scheduled = draws.find(d => d.status === 'SCHEDULED' || d.status === 'IN_PROGRESS');
      if (scheduled) {
        setDraw(scheduled);
        if (scheduled.status === 'IN_PROGRESS') setStatus('live');
      }
    }).catch(console.error);
  }, [tournamentId]);

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('draw:join', tournamentId);

    socket.on('draw:match', (matchData) => {
      setStatus('live');
      setMatches((prev) => [...prev, matchData]);
    });

    socket.on('draw:complete', () => {
      setStatus('complete');
    });

    return () => {
      socket.emit('draw:leave', tournamentId);
      socket.disconnect();
    };
  }, [tournamentId]);

  const scheduledTime = draw ? new Date(draw.scheduledAt) : null;
  const isScheduled = scheduledTime && scheduledTime > new Date();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-xl p-8 mb-8 text-center">
        <Eye className="w-12 h-12 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Live Draw</h1>
        {tournament && <p className="text-blue-200 text-lg">{tournament.name}</p>}
      </div>

      {/* Status */}
      {status === 'waiting' && isScheduled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center mb-8">
          <Clock className="w-10 h-10 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">Draw Scheduled</h2>
          <p className="text-yellow-700 text-lg">
            {scheduledTime.toLocaleString('en-GB', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
          <p className="text-yellow-600 mt-2 text-sm">Stay on this page — the draw will appear live when it begins.</p>
        </div>
      )}

      {status === 'live' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center justify-center gap-3">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-semibold text-red-800">LIVE — Draw in progress</span>
        </div>
      )}

      {status === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center justify-center gap-3">
          <Trophy className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-800">Draw Complete</span>
        </div>
      )}

      {/* Drawn matches */}
      <div className="space-y-3">
        {matches.map((m, idx) => (
          <div
            key={m.matchId}
            className="bg-white border rounded-lg p-4 flex items-center justify-between animate-fade-in"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 w-12">R{m.roundNumber} M{m.matchNumber}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {m.playerA ? `${m.playerA.firstName} ${m.playerA.lastName}` : 'TBD'}
                </span>
                <span className="text-gray-400 text-sm">vs</span>
                <span className="font-medium">
                  {m.isBye ? (
                    <span className="text-gray-400 italic">BYE</span>
                  ) : m.playerB ? (
                    `${m.playerB.firstName} ${m.playerB.lastName}`
                  ) : 'TBD'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {matches.length === 0 && status !== 'waiting' && (
          <p className="text-gray-500 text-center py-8">Waiting for draw to begin...</p>
        )}
      </div>
    </div>
  );
}

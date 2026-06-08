import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { api } from '../../api/client';

function MatchCard({ match, myPlayerId }) {
  const playerAName = match.playerA
    ? `${match.playerA.firstName} ${match.playerA.lastName}`
    : 'TBD';
  const playerBName = match.playerB
    ? `${match.playerB.firstName} ${match.playerB.lastName}`
    : match.playerA ? 'BYE' : 'TBD';

  const isComplete = match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED';
  const winnerId = match.winnerId;
  const isMyMatch = myPlayerId && (match.playerAId === myPlayerId || match.playerBId === myPlayerId);

  return (
    <div className={`bg-white border rounded-lg shadow-sm overflow-hidden min-w-[220px] ${isMyMatch ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}>
      <div className={`px-3 py-1.5 border-b flex justify-between items-center ${
        isComplete ? 'bg-green-50' : match.status === 'DISPUTED' ? 'bg-red-50' : isMyMatch ? 'bg-green-50' : 'bg-gray-50'
      }`}>
        <span className="text-xs font-medium text-gray-500">
          Match {match.matchNumber}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          match.status === 'PENDING' ? 'bg-gray-200 text-gray-600' :
          match.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
          match.status === 'RESULT_SUBMITTED' ? 'bg-yellow-100 text-yellow-700' :
          isComplete ? 'bg-green-100 text-green-700' :
          match.status === 'DISPUTED' ? 'bg-red-100 text-red-700' :
          'bg-gray-200 text-gray-600'
        }`}>
          {match.status === 'RESULT_SUBMITTED' ? 'Awaiting Confirm' : match.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="divide-y">
        <PlayerRow
          name={playerAName}
          handicap={match.playerA?.handicapIndex}
          isWinner={winnerId === match.playerA?.id}
          isLoser={winnerId && winnerId !== match.playerA?.id}
          isMe={myPlayerId && match.playerAId === myPlayerId}
        />
        <PlayerRow
          name={playerBName}
          handicap={match.playerB?.handicapIndex}
          isWinner={winnerId === match.playerB?.id}
          isLoser={winnerId && winnerId !== match.playerB?.id}
          isMe={myPlayerId && match.playerBId === myPlayerId}
        />
      </div>

      {match.result?.resultText && (
        <div className="px-3 py-1 bg-gray-50 border-t">
          <span className="text-xs text-gray-600">{match.result.resultText}</span>
        </div>
      )}
      {match.scheduledDate && (
        <div className="px-3 py-1 bg-blue-50 border-t">
          <span className="text-xs text-blue-600">{new Date(match.scheduledDate).toLocaleDateString('en-GB')}</span>
          {match.venueClub && <span className="text-xs text-blue-500 ml-1">@ {match.venueClub.name}</span>}
        </div>
      )}
    </div>
  );
}

function PlayerRow({ name, handicap, isWinner, isLoser, isMe }) {
  return (
    <div className={`px-3 py-1.5 flex justify-between items-center text-sm ${
      isWinner ? 'bg-green-50 font-semibold' :
      isLoser ? 'opacity-50' : ''
    }`}>
      <span className={`truncate ${isMe ? 'text-green-700 font-semibold' : ''}`}>
        {isMe && '• '}{name}
      </span>
      {handicap != null && (
        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">({Number(handicap).toFixed(1)})</span>
      )}
    </div>
  );
}

export default function KnockoutBracket({ rounds, totalRounds, roundLabels }) {
  const { user } = useAuth();
  const [myPlayerId, setMyPlayerId] = useState(null);

  useEffect(() => {
    if (user) {
      api.get('/players/me').then(p => setMyPlayerId(p.id)).catch(() => {});
    }
  }, [user]);

  if (!rounds || totalRounds === 0) {
    return <p className="text-gray-500 text-center py-8">No bracket data available yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 min-w-max p-4">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((roundNum) => {
          const matchesInRound = rounds[roundNum] || [];
          const isLastRound = roundNum === totalRounds;
          return (
            <div key={roundNum} className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 text-center mb-3 px-4">
                {roundLabels?.[roundNum] || `Round ${roundNum}`}
              </h3>
              <div className="flex flex-col justify-around flex-1 gap-2 px-2">
                {matchesInRound.map((match, matchIdx) => (
                  <div key={match.id} className="flex items-center">
                    <MatchCard match={match} myPlayerId={myPlayerId} />
                    {!isLastRound && (
                      <div className="relative w-10 flex-shrink-0">
                        {/* Horizontal connector from match card */}
                        <div className="absolute left-0 top-1/2 w-5 h-px bg-gray-300"></div>
                        {/* Vertical connector: top half for even matches, bottom half for odd */}
                        {matchIdx % 2 === 0 ? (
                          <div className="absolute left-5 top-1/2 w-px bg-gray-300" style={{ height: '50%' }}></div>
                        ) : (
                          <div className="absolute left-5 bottom-1/2 w-px bg-gray-300" style={{ height: '50%' }}></div>
                        )}
                        {/* Horizontal connector to next round */}
                        {matchIdx % 2 === 1 && (
                          <div className="absolute left-5 top-1/2 w-5 h-px bg-gray-300" style={{ transform: 'translateY(-50%)' }}></div>
                        )}
                        {matchIdx % 2 === 0 && matchIdx + 1 < matchesInRound.length && (
                          <div className="absolute left-5 bottom-0 w-5 h-px bg-gray-300"></div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {myPlayerId && (
        <p className="text-xs text-green-600 text-center mt-2">
          • Your matches are highlighted in green
        </p>
      )}
    </div>
  );
}

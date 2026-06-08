import { clsx } from 'clsx';

function MatchCard({ match, roundLabel }) {
  const playerAName = match.playerA
    ? `${match.playerA.firstName} ${match.playerA.lastName}`
    : 'TBD';
  const playerBName = match.playerB
    ? `${match.playerB.firstName} ${match.playerB.lastName}`
    : match.playerA ? 'BYE' : 'TBD';

  const isComplete = match.status === 'COMPLETED' || match.status === 'RESULT_CONFIRMED';
  const winnerId = match.winnerId;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden min-w-[220px]">
      <div className={clsx(
        'px-3 py-2 border-b flex justify-between items-center',
        isComplete ? 'bg-green-50' : match.status === 'DISPUTED' ? 'bg-red-50' : 'bg-gray-50'
      )}>
        <span className="text-xs font-medium text-gray-500">
          Match {match.matchNumber}
        </span>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full', {
          'bg-gray-200 text-gray-600': match.status === 'PENDING',
          'bg-blue-100 text-blue-700': match.status === 'SCHEDULED',
          'bg-yellow-100 text-yellow-700': match.status === 'RESULT_SUBMITTED',
          'bg-green-100 text-green-700': isComplete,
          'bg-red-100 text-red-700': match.status === 'DISPUTED',
        })}>
          {match.status === 'RESULT_SUBMITTED' ? 'Awaiting Confirm' : match.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="divide-y">
        <div className={clsx('px-3 py-2 flex justify-between items-center', {
          'bg-green-50 font-semibold': winnerId === match.playerA?.id,
          'opacity-50': winnerId && winnerId !== match.playerA?.id,
        })}>
          <span className="text-sm truncate">{playerAName}</span>
          {match.playerA?.handicapIndex && (
            <span className="text-xs text-gray-400 ml-2">({Number(match.playerA.handicapIndex).toFixed(1)})</span>
          )}
        </div>
        <div className={clsx('px-3 py-2 flex justify-between items-center', {
          'bg-green-50 font-semibold': winnerId === match.playerB?.id,
          'opacity-50': winnerId && winnerId !== match.playerB?.id,
        })}>
          <span className="text-sm truncate">{playerBName}</span>
          {match.playerB?.handicapIndex && (
            <span className="text-xs text-gray-400 ml-2">({Number(match.playerB.handicapIndex).toFixed(1)})</span>
          )}
        </div>
      </div>

      {match.result?.resultText && (
        <div className="px-3 py-1 bg-gray-50 border-t">
          <span className="text-xs text-gray-600">{match.result.resultText}</span>
        </div>
      )}
    </div>
  );
}

export default function KnockoutBracket({ rounds, totalRounds, roundLabels }) {
  if (!rounds || totalRounds === 0) {
    return <p className="text-gray-500 text-center py-8">No bracket data available yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max p-4">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((roundNum) => (
          <div key={roundNum} className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-700 text-center mb-2">
              {roundLabels?.[roundNum] || `Round ${roundNum}`}
            </h3>
            <div className="flex flex-col justify-around gap-4 flex-1">
              {(rounds[roundNum] || []).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

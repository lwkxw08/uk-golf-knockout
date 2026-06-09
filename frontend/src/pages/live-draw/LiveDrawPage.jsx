import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../../api/client';
import { Eye, Clock, Trophy, MapPin, Users, ChevronRight } from 'lucide-react';

export default function LiveDrawPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [draw, setDraw] = useState(null);
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState('waiting'); // waiting | countdown | live | complete
  const [currentWeek, setCurrentWeek] = useState(0);
  const [totalWeeks, setTotalWeeks] = useState(6);
  const [weekFixtures, setWeekFixtures] = useState({}); // { 1: [{...}], 2: [...] }
  const [revealingWeek, setRevealingWeek] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [viewerCount, setViewerCount] = useState(1);
  const [isLeague, setIsLeague] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/tournaments/${tournamentId}`).then(t => {
      setTournament(t);
      const hasLeague = t.stages?.some(s => s.isLeague);
      setIsLeague(hasLeague);
    }).catch(console.error);

    api.get(`/draws/${tournamentId}`).then((draws) => {
      const scheduled = draws.find(d => d.status === 'SCHEDULED' || d.status === 'IN_PROGRESS');
      if (scheduled) {
        setDraw(scheduled);
        if (scheduled.status === 'IN_PROGRESS') setStatus('live');
      }
      const completed = draws.find(d => d.status === 'COMPLETED');
      if (completed && !scheduled) {
        setDraw(completed);
        setStatus('complete');
      }
    }).catch(console.error);

    // Check for existing league fixtures (if draw already completed)
    api.get(`/league/${tournamentId}/fixtures`).then(data => {
      if (data.fixtures && Object.keys(data.fixtures).length > 0) {
        setWeekFixtures(data.fixtures);
        setStatus('complete');
      }
    }).catch(() => {});
  }, [tournamentId]);

  // Countdown timer
  useEffect(() => {
    if (!draw?.scheduledAt || status !== 'waiting') return;
    const target = new Date(draw.scheduledAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown(null);
        setStatus('countdown');
        clearInterval(interval);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [draw, status]);

  // Socket.io connection
  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('draw:join', tournamentId);

    // Knockout draw events
    socket.on('draw:match', (matchData) => {
      setStatus('live');
      setMatches((prev) => [...prev, matchData]);
    });
    socket.on('draw:complete', () => setStatus('complete'));

    // League draw events
    socket.on('league-draw:starting', (data) => {
      setStatus('live');
      setTotalWeeks(data.totalWeeks);
      setIsLeague(true);
    });

    socket.on('league-draw:week-announce', (data) => {
      setRevealingWeek(data.gameWeek);
      setCurrentWeek(data.gameWeek);
    });

    socket.on('league-draw:fixture', (fixtureData) => {
      setWeekFixtures(prev => {
        const week = fixtureData.gameWeek;
        const existing = prev[week] || [];
        return { ...prev, [week]: [...existing, fixtureData] };
      });
    });

    socket.on('league-draw:week-complete', (data) => {
      setRevealingWeek(null);
    });

    socket.on('league-draw:complete', (data) => {
      setStatus('complete');
      setTotalWeeks(data.totalWeeks);
    });

    socket.on('league-draw:week-regenerated', (data) => {
      // Refresh fixtures for the regenerated week
      api.get(`/league/${tournamentId}/fixtures?gameWeek=${data.gameWeek}`).then(resp => {
        setWeekFixtures(prev => ({ ...prev, [data.gameWeek]: resp.matches || [] }));
      }).catch(console.error);
    });

    return () => {
      socket.emit('draw:leave', tournamentId);
      socket.disconnect();
    };
  }, [tournamentId]);

  const scheduledTime = draw ? new Date(draw.scheduledAt) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white rounded-xl p-8 mb-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.05)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative">
          <Eye className="w-12 h-12 mx-auto mb-4 text-blue-300" />
          <h1 className="text-3xl font-bold mb-2">
            {isLeague ? 'Live League Draw' : 'Live Draw'}
          </h1>
          {tournament && <p className="text-blue-200 text-lg">{tournament.name}</p>}
          {isLeague && (
            <p className="text-blue-300 text-sm mt-2">
              6 game weeks — 3 home / 3 away per player
            </p>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      {status === 'waiting' && countdown && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center mb-8">
          <Clock className="w-10 h-10 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-amber-900 mb-4">Draw Day Countdown</h2>
          <div className="flex justify-center gap-4 mb-4">
            <CountdownUnit value={countdown.days} label="Days" />
            <CountdownUnit value={countdown.hours} label="Hours" />
            <CountdownUnit value={countdown.minutes} label="Mins" />
            <CountdownUnit value={countdown.seconds} label="Secs" />
          </div>
          <p className="text-amber-700 text-sm">
            Draw scheduled for{' '}
            {scheduledTime?.toLocaleString('en-GB', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
          <p className="text-amber-600 mt-2 text-xs">Stay on this page — fixtures will appear live when the draw begins.</p>
        </div>
      )}

      {status === 'waiting' && !countdown && !draw && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center mb-8">
          <Clock className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Draw Not Yet Scheduled</h2>
          <p className="text-gray-500 text-sm">The draw date and time will be announced soon.</p>
        </div>
      )}

      {status === 'countdown' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center mb-8 animate-pulse">
          <h2 className="text-xl font-bold text-blue-800">Draw Starting Soon...</h2>
          <p className="text-blue-600 text-sm mt-1">The admin will begin the live draw shortly.</p>
        </div>
      )}

      {status === 'live' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center justify-center gap-3">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-semibold text-red-800">LIVE — Draw in progress</span>
          {revealingWeek && (
            <span className="bg-red-200 text-red-900 px-3 py-0.5 rounded-full text-sm ml-2">
              Revealing Game Week {revealingWeek}
            </span>
          )}
        </div>
      )}

      {status === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center justify-center gap-3">
          <Trophy className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-800">Draw Complete — All fixtures revealed</span>
        </div>
      )}

      {/* League Draw Content */}
      {isLeague && Object.keys(weekFixtures).length > 0 && (
        <LeagueFixtureDisplay
          weekFixtures={weekFixtures}
          totalWeeks={totalWeeks}
          revealingWeek={revealingWeek}
          status={status}
        />
      )}

      {/* Knockout Draw Content */}
      {!isLeague && matches.length > 0 && (
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
        </div>
      )}

      {/* Empty state */}
      {!isLeague && matches.length === 0 && Object.keys(weekFixtures).length === 0 && status === 'live' && (
        <p className="text-gray-500 text-center py-8 animate-pulse">Waiting for fixtures to be revealed...</p>
      )}
    </div>
  );
}

function CountdownUnit({ value, label }) {
  return (
    <div className="bg-white rounded-lg p-4 min-w-[80px] shadow-sm border border-amber-100">
      <div className="text-3xl font-bold text-amber-900">{String(value).padStart(2, '0')}</div>
      <div className="text-xs text-amber-600 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function LeagueFixtureDisplay({ weekFixtures, totalWeeks, revealingWeek, status }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const revealedWeeks = Object.keys(weekFixtures).map(Number).sort((a, b) => a - b);

  // Default to first revealed week or currently revealing
  useEffect(() => {
    if (revealingWeek) {
      setSelectedWeek(revealingWeek);
    } else if (!selectedWeek && revealedWeeks.length > 0) {
      setSelectedWeek(revealedWeeks[0]);
    }
  }, [revealingWeek, revealedWeeks.length]);

  const currentFixtures = weekFixtures[selectedWeek] || [];

  return (
    <div>
      {/* Week selector tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => {
          const isRevealed = revealedWeeks.includes(week);
          const isRevealing = week === revealingWeek;
          const isSelected = week === selectedWeek;

          return (
            <button
              key={week}
              onClick={() => isRevealed && setSelectedWeek(week)}
              disabled={!isRevealed}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-blue-700 text-white shadow-md'
                  : isRevealing
                  ? 'bg-red-100 text-red-800 border-2 border-red-300 animate-pulse'
                  : isRevealed
                  ? 'bg-white border text-gray-700 hover:bg-gray-50'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Week {week}
              {isRevealing && <span className="ml-1 text-xs">LIVE</span>}
            </button>
          );
        })}
      </div>

      {/* Fixture cards */}
      {selectedWeek && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Game Week {selectedWeek}
            <span className="text-sm font-normal text-gray-500 ml-2">
              {currentFixtures.length} {currentFixtures.length === 1 ? 'match' : 'matches'}
            </span>
          </h3>

          {currentFixtures.map((f, idx) => (
            <FixtureCard
              key={f.matchId || idx}
              fixture={f}
              index={idx}
              isAnimating={status === 'live' && selectedWeek === revealingWeek}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {status === 'complete' && (
        <div className="mt-8 bg-gray-50 border rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Draw Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalWeeks}</p>
              <p className="text-xs text-gray-500">Game Weeks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(weekFixtures).reduce((sum, w) => sum + (Array.isArray(w) ? w.length : 0), 0)}
              </p>
              <p className="text-xs text-gray-500">Total Matches</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">3</p>
              <p className="text-xs text-gray-500">Home per Player</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">3</p>
              <p className="text-xs text-gray-500">Away per Player</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FixtureCard({ fixture, index, isAnimating }) {
  // Handle both live draw format and API format
  const home = fixture.home || {
    name: fixture.playerA ? `${fixture.playerA.firstName} ${fixture.playerA.lastName}` : 'TBD',
    handicap: fixture.playerA?.handicapIndex,
    club: fixture.playerA?.homeClub?.name || fixture.venueClub?.name,
  };
  const away = fixture.away || {
    name: fixture.playerB ? `${fixture.playerB.firstName} ${fixture.playerB.lastName}` : 'TBD',
    handicap: fixture.playerB?.handicapIndex,
    club: fixture.playerB?.homeClub?.name,
  };
  const venue = fixture.venue || fixture.venueClub?.name || home.club;
  const resultText = fixture.result?.resultText;
  const matchStatus = fixture.status;

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all ${
        isAnimating ? 'animate-slide-in' : ''
      } hover:shadow-md`}
      style={isAnimating ? { animationDelay: `${index * 0.2}s`, animationFillMode: 'both' } : {}}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Home player */}
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">HOME</span>
            <span className="font-semibold text-gray-900">{home.name}</span>
            {home.handicap != null && (
              <span className="text-xs text-gray-500">({Number(home.handicap).toFixed(1)})</span>
            )}
            <span className="text-xs text-gray-400">{home.club}</span>
          </div>

          {/* vs divider */}
          <div className="flex items-center gap-2 my-1 ml-14">
            <span className="text-xs text-gray-400 font-medium">vs</span>
            <div className="flex-1 border-t border-dashed border-gray-200" />
          </div>

          {/* Away player */}
          <div className="flex items-center gap-3 mt-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">AWAY</span>
            <span className="font-semibold text-gray-900">{away.name}</span>
            {away.handicap != null && (
              <span className="text-xs text-gray-500">({Number(away.handicap).toFixed(1)})</span>
            )}
            <span className="text-xs text-gray-400">{away.club}</span>
          </div>
        </div>

        {/* Right side: venue + result */}
        <div className="text-right ml-4">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1 justify-end">
            <MapPin className="w-3 h-3" /> {venue}
          </div>
          {resultText && (
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-medium">
              {resultText}
            </span>
          )}
          {matchStatus === 'SCHEDULED' && !resultText && (
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs">
              Scheduled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api } from '../../api/client';
import { Upload, Check, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Utility functions ──────────────────────────────────────────────────────

function distributeStrokes(playingHandicap, holes) {
  const strokes = {};
  for (let i = 1; i <= 18; i++) strokes[i] = 0;
  if (playingHandicap <= 0 || !holes?.length) return strokes;
  const sorted = [...holes].filter(h => h.strokeIndex).sort((a, b) => a.strokeIndex - b.strokeIndex);
  let remaining = playingHandicap;
  const fullRounds = Math.floor(remaining / 18);
  for (const h of sorted) strokes[h.holeNumber] = fullRounds;
  remaining -= fullRounds * 18;
  for (const h of sorted) {
    if (remaining <= 0) break;
    strokes[h.holeNumber]++;
    remaining--;
  }
  return strokes;
}

const DEFAULT_STABLEFORD = { doubleBogeyOrWorse: 0, bogey: 1, par: 2, birdie: 3, eagle: 4, albatross: 5 };

function calcStablefordPoints(grossScore, par, extraStrokes, config) {
  const netScore = grossScore - extraStrokes;
  const diff = netScore - par;
  if (diff <= -3) return config.albatross ?? 5;
  if (diff === -2) return config.eagle ?? 4;
  if (diff === -1) return config.birdie ?? 3;
  if (diff === 0) return config.par ?? 2;
  if (diff === 1) return config.bogey ?? 1;
  return config.doubleBogeyOrWorse ?? 0;
}

function getInitials(firstName, lastName) {
  return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
}

const PLAYER_COLORS = [
  { bg: 'bg-green-600', text: 'text-white', ring: 'ring-green-600', light: 'bg-green-50' },
  { bg: 'bg-blue-600', text: 'text-white', ring: 'ring-blue-600', light: 'bg-blue-50' },
  { bg: 'bg-purple-600', text: 'text-white', ring: 'ring-purple-600', light: 'bg-purple-50' },
  { bg: 'bg-amber-600', text: 'text-white', ring: 'ring-amber-600', light: 'bg-amber-50' },
];

// ── Standard golf scorecard markings ───────────────────────────────────────
// Eagle or better = double circle, Birdie = single circle,
// Par = no marking, Bogey = single square, Double bogey+ = double square

function ScoreMarking({ score, par, extraStrokes, children }) {
  if (!score || score === 'PU') return <>{children}</>;
  const net = Number(score) - (extraStrokes || 0);
  const diff = net - par;

  if (diff <= -2) {
    // Eagle or better — double circle
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-900 relative">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-gray-900 text-sm font-bold">
          {children}
        </span>
      </span>
    );
  }
  if (diff === -1) {
    // Birdie — single circle
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-900 text-sm font-bold">
        {children}
      </span>
    );
  }
  if (diff === 0) {
    // Par — no marking, just the number
    return <span className="inline-flex items-center justify-center w-9 h-9 text-sm font-bold">{children}</span>;
  }
  if (diff === 1) {
    // Bogey — single square
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 border-2 border-gray-900 rounded-sm text-sm font-bold">
        {children}
      </span>
    );
  }
  // Double bogey or worse — double square
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 border-2 border-gray-900 rounded-sm relative">
      <span className="inline-flex items-center justify-center w-7 h-7 border-2 border-gray-900 rounded-sm text-sm font-bold">
        {children}
      </span>
    </span>
  );
}

// ── Score selection popup ──────────────────────────────────────────────────

function ScorePopup({ holePar, onSelect, onPickUp, showPickUp, onClose, playerName, playerColor }) {
  const scores = [];
  for (let i = 1; i <= 12; i++) scores.push(i);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
        <div className={`${playerColor.bg} ${playerColor.text} rounded-t-2xl px-4 py-3 text-center`}>
          <p className="text-sm opacity-80">Enter score for</p>
          <p className="font-bold text-lg">{playerName}</p>
          <p className="text-xs opacity-70 mt-0.5">Par {holePar}</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {scores.map(s => {
              const diff = s - holePar;
              let ringCls = '';
              if (diff <= -2) ringCls = 'ring-2 ring-yellow-400 bg-yellow-50';
              else if (diff === -1) ringCls = 'ring-2 ring-green-500 bg-green-50';
              else if (diff === 0) ringCls = 'bg-gray-50';
              else if (diff === 1) ringCls = 'ring-2 ring-red-300 bg-red-50';
              else if (diff >= 2) ringCls = 'ring-2 ring-red-500 bg-red-50';

              return (
                <button
                  key={s}
                  onClick={() => onSelect(s)}
                  className={`h-12 rounded-xl font-bold text-lg transition-all active:scale-95 hover:shadow-md ${ringCls || 'bg-gray-100'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {showPickUp && (
            <button
              onClick={onPickUp}
              className="mt-3 w-full py-3 rounded-xl bg-amber-100 text-amber-800 font-semibold text-sm hover:bg-amber-200 transition"
            >
              Pick Up
            </button>
          )}
        </div>
        <button onClick={onClose} className="w-full py-3 text-gray-400 text-sm hover:text-gray-600 border-t">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Player initials bubble ─────────────────────────────────────────────────

function PlayerBubble({ initials, color, score, holePar, extraStrokes, onClick, isPickUp }) {
  const hasScore = score != null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all active:scale-95 ${color.bg} ${color.text} shadow-sm hover:shadow-md`}
      >
        {initials}
      </button>
      {hasScore ? (
        isPickUp ? (
          <span className="inline-flex items-center justify-center w-9 h-6 bg-amber-100 text-amber-700 rounded text-xs font-bold">PU</span>
        ) : (
          <ScoreMarking score={score} par={holePar} extraStrokes={extraStrokes}>
            {score}
          </ScoreMarking>
        )
      ) : (
        <button
          onClick={onClick}
          className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-600 transition"
        >
          <span className="text-xl leading-none">+</span>
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DigitalScorecard({ match, player, onClose, onCompleted }) {
  const [scoreData, setScoreData] = useState(null);
  // allScores: { [playerId]: { [holeNumber]: score|'PU' } }
  const [allScores, setAllScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('entry'); // entry | comparison | dispute
  const [disputeReason, setDisputeReason] = useState('');
  const [showUploadFallback, setShowUploadFallback] = useState(false);

  // Current hole being viewed (1-18)
  const [currentHole, setCurrentHole] = useState(1);
  // Score popup state: { playerId, playerIndex }
  const [scorePopup, setScorePopup] = useState(null);

  const holeListRef = useRef(null);

  useEffect(() => {
    loadScoreData();
  }, [match.id]);

  async function loadScoreData() {
    try {
      const data = await api.get(`/scoring/${match.id}/scores`);
      setScoreData(data);
      // Pre-fill from any already-submitted data
      const isA = match.playerAId === player.id;
      const existing = {};
      const playerAId = match.playerAId;
      const playerBId = match.playerBId;
      if (playerAId) existing[playerAId] = {};
      if (playerBId) existing[playerBId] = {};

      data.holes.forEach(h => {
        if (h.playerA && playerAId) existing[playerAId][h.holeNumber] = h.playerA.gross;
        if (h.playerB && playerBId) existing[playerBId][h.holeNumber] = h.playerB.gross;
      });
      setAllScores(existing);

      const mySubmitted = isA ? data.playerA?.submitted : data.playerB?.submitted;
      if (mySubmitted && data.bothSubmitted) setMode('comparison');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const isPlayerA = match.playerAId === player.id;
  const stablefordConfig = scoreData?.stablefordConfig || DEFAULT_STABLEFORD;
  const holes = scoreData?.holes || [];
  const tee = scoreData?.tee;

  // Build players list — support 2+ players (pairs/team/group formats)
  const players = useMemo(() => {
    const list = [];
    const pA = match.playerA;
    const pB = match.playerB;
    if (pA) {
      list.push({
        id: match.playerAId,
        firstName: pA.firstName,
        lastName: pA.lastName,
        initials: getInitials(pA.firstName, pA.lastName),
        color: PLAYER_COLORS[0],
        handicapData: scoreData?.playerA,
        isMe: match.playerAId === player.id,
        key: 'playerA',
      });
    }
    if (pB) {
      list.push({
        id: match.playerBId,
        firstName: pB.firstName,
        lastName: pB.lastName,
        initials: getInitials(pB.firstName, pB.lastName),
        color: PLAYER_COLORS[1],
        handicapData: scoreData?.playerB,
        isMe: match.playerBId === player.id,
        key: 'playerB',
      });
    }
    // Future: add extra group players here for pairs/team formats
    // e.g. match.groupPlayers?.forEach(...)
    return list;
  }, [match, scoreData, player.id]);

  // Strokes per hole for each player
  const playerStrokes = useMemo(() => {
    const map = {};
    players.forEach(p => {
      if (p.handicapData) {
        map[p.id] = distributeStrokes(
          p.handicapData.playingHandicap,
          holes.map(h => ({ holeNumber: h.holeNumber, strokeIndex: h.strokeIndex }))
        );
      } else {
        map[p.id] = {};
      }
    });
    return map;
  }, [players, holes]);

  // Compute running totals per player
  const playerTotals = useMemo(() => {
    const map = {};
    players.forEach(p => {
      let gross = 0, net = 0, stableford = 0;
      const scores = allScores[p.id] || {};
      const strokes = playerStrokes[p.id] || {};
      for (let h = 1; h <= 18; h++) {
        const s = scores[h];
        if (s && s !== 'PU') {
          const holeData = holes.find(x => x.holeNumber === h);
          const par = holeData?.par || 4;
          const extra = strokes[h] || 0;
          gross += s;
          net += s - extra;
          stableford += calcStablefordPoints(s, par, extra, stablefordConfig);
        }
      }
      map[p.id] = { gross, net, stableford };
    });
    return map;
  }, [allScores, players, playerStrokes, holes, stablefordConfig]);

  // Check if all holes are entered for ALL players (own + opponent)
  const myId = player.id;
  const myScores = allScores[myId] || {};
  const allMyHolesEntered = Object.keys(myScores).length === 18 && Object.values(myScores).every(v => v && v !== '');
  const allPlayersAllHoles = players.every(p => {
    const s = allScores[p.id] || {};
    return Object.keys(s).length === 18 && Object.values(s).every(v => v && v !== '');
  });
  const allHolesEntered = allPlayersAllHoles;

  // Determine if matchplay or stableford (show pick-up option)
  const isMatchplay = match.tournament?.format === 'MATCHPLAY' || match.tournament?.type === 'KNOCKOUT' || true; // default to showing pick-up
  const showPickUp = true; // Always show pick-up for matchplay/stableford

  function setPlayerScore(playerId, holeNum, score) {
    setAllScores(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || {}), [holeNum]: score },
    }));
  }

  function handleScoreSelect(score) {
    if (!scorePopup) return;
    const p = players[scorePopup.playerIndex];
    setPlayerScore(p.id, currentHole, score);
    setScorePopup(null);

    // Auto-advance to next player on same hole
    const nextIdx = scorePopup.playerIndex + 1;
    if (nextIdx < players.length) {
      // Small delay so the UI updates before opening next popup
      setTimeout(() => setScorePopup({ playerId: players[nextIdx].id, playerIndex: nextIdx }), 150);
    }
    // If all players on this hole are done, stay on this hole (user navigates)
  }

  function handlePickUp() {
    if (!scorePopup) return;
    const p = players[scorePopup.playerIndex];
    setPlayerScore(p.id, currentHole, 'PU');
    setScorePopup(null);

    const nextIdx = scorePopup.playerIndex + 1;
    if (nextIdx < players.length) {
      setTimeout(() => setScorePopup({ playerId: players[nextIdx].id, playerIndex: nextIdx }), 150);
    }
  }

  async function handleSubmitScores() {
    if (!allHolesEntered) {
      setError('Please enter scores for all 18 holes for every player');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Own scores
      const scores = Object.entries(myScores).map(([hole, score]) => ({
        holeNumber: Number(hole),
        score: score === 'PU' ? 0 : Number(score),
      }));

      // Opponent scores (the logged-in player's version of the opponent's scores)
      const opponentPlayer = players.find(p => p.id !== myId);
      let opponentScores = undefined;
      if (opponentPlayer) {
        const oppScoreData = allScores[opponentPlayer.id] || {};
        opponentScores = Object.entries(oppScoreData).map(([hole, score]) => ({
          holeNumber: Number(hole),
          score: score === 'PU' ? 0 : Number(score),
        }));
      }

      const payload = { scores };
      if (opponentScores) payload.opponentScores = opponentScores;

      const alreadySubmitted = isPlayerA ? scoreData?.playerA?.submitted : scoreData?.playerB?.submitted;
      if (alreadySubmitted) {
        await api.put(`/scoring/${match.id}/scores`, payload);
      } else {
        await api.post(`/scoring/${match.id}/scores`, payload);
      }
      await loadScoreData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptScores() {
    setSubmitting(true);
    try {
      const result = await api.post(`/scoring/${match.id}/scores/accept`);
      onCompleted?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/scoring/${match.id}/scores/dispute`, { reason: disputeReason });
      onCompleted?.({ disputed: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const navigateHole = useCallback((dir) => {
    setCurrentHole(prev => {
      const next = prev + dir;
      if (next < 1 || next > 18) return prev;
      return next;
    });
  }, []);

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-center">Loading scorecard...</div>
    </div>
  );

  const currentHoleData = holes.find(h => h.holeNumber === currentHole);
  const holePar = currentHoleData?.par || 4;
  const holeSI = currentHoleData?.strokeIndex || '—';
  const opponent = isPlayerA ? match.playerB : match.playerA;
  const opponentName = opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Opponent';

  // Count how many holes have all players scored
  const holesCompleted = (() => {
    let count = 0;
    for (let h = 1; h <= 18; h++) {
      const allDone = players.every(p => {
        const s = (allScores[p.id] || {})[h];
        return s != null && s !== '';
      });
      if (allDone) count++;
    }
    return count;
  })();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h3 className="font-bold text-lg">Scorecard</h3>
            <p className="text-xs text-gray-500 truncate">
              {match.tournament?.name}
              {tee && <span className="ml-1 text-green-700">({tee.teeName}, SR {tee.slopeRating})</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'entry' ? 'summary' : 'entry')}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
            >
              {mode === 'entry' ? 'Summary' : 'Card'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Player Legend */}
        <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-3 overflow-x-auto">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5 shrink-0">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${p.color.bg} ${p.color.text}`}>
                {p.initials}
              </span>
              <span className="text-xs text-gray-700 font-medium">
                {p.firstName} {p.lastName?.[0]}.
                {p.isMe && <span className="text-green-600 ml-0.5">(You)</span>}
              </span>
              {p.handicapData && (
                <span className="text-[10px] text-gray-400 ml-0.5">Hcp {p.handicapData.playingHandicap}</span>
              )}
            </div>
          ))}
        </div>

        {error && <div className="mx-4 mt-3 bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

        {/* ── ENTRY MODE ── */}
        {mode === 'entry' && (
          <div className="p-4">
            {/* Info: mark all players */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3 text-xs text-blue-700">
              Enter scores for <strong>all players</strong> — your own and your opponent's. Both players' submissions will be cross-checked for confirmation.
            </div>

            {/* Hole Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateHole(-1)}
                disabled={currentHole === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Hole</p>
                <p className="text-4xl font-black text-gray-900">{currentHole}</p>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="text-sm text-gray-500">Par <strong className="text-gray-800">{holePar}</strong></span>
                  <span className="text-sm text-gray-500">SI <strong className="text-gray-800">{holeSI}</strong></span>
                </div>
              </div>

              <button
                onClick={() => navigateHole(1)}
                disabled={currentHole === 18}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Strokes received indicators */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {players.map(p => {
                const strokes = (playerStrokes[p.id] || {})[currentHole] || 0;
                if (strokes <= 0) return null;
                return (
                  <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full ${p.color.light} font-medium`}>
                    {p.initials}: {strokes} stroke{strokes > 1 ? 's' : ''}
                  </span>
                );
              })}
            </div>

            {/* Player Score Bubbles */}
            <div className="flex items-start justify-center gap-6 mb-6">
              {players.map((p, idx) => {
                const score = (allScores[p.id] || {})[currentHole];
                const isPickUp = score === 'PU';
                const strokes = (playerStrokes[p.id] || {})[currentHole] || 0;
                return (
                  <PlayerBubble
                    key={p.id}
                    initials={p.initials}
                    color={p.color}
                    score={isPickUp ? 'PU' : score}
                    holePar={holePar}
                    extraStrokes={strokes}
                    isPickUp={isPickUp}
                    onClick={() => setScorePopup({ playerId: p.id, playerIndex: idx })}
                  />
                );
              })}
            </div>

            {/* Hole dots navigation */}
            <div className="flex items-center justify-center gap-1 mb-4 flex-wrap" ref={holeListRef}>
              {[...Array(18)].map((_, i) => {
                const h = i + 1;
                const allDone = players.every(p => {
                  const s = (allScores[p.id] || {})[h];
                  return s != null && s !== '';
                });
                const isCurrent = h === currentHole;
                return (
                  <button
                    key={h}
                    onClick={() => setCurrentHole(h)}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-green-700 text-white scale-110 shadow'
                        : allDone
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            {/* Front 9 / Back 9 divider */}
            {currentHole === 9 && (
              <div className="text-center mb-3">
                <button
                  onClick={() => setCurrentHole(10)}
                  className="text-sm text-green-700 font-medium hover:underline"
                >
                  Continue to back 9 →
                </button>
              </div>
            )}

            {/* Progress & Submit */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{holesCompleted}/18 holes completed</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${(holesCompleted / 18) * 100}%` }} />
                </div>
              </div>

              {/* Running Totals per Player */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {players.map(p => {
                  const totals = playerTotals[p.id] || {};
                  return (
                    <div key={p.id} className={`rounded-lg p-3 ${p.color.light} border`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${p.color.bg} ${p.color.text}`}>
                          {p.initials}
                        </span>
                        <span className="text-xs font-medium text-gray-700">{p.firstName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold">{totals.gross || '—'}</p>
                          <p className="text-[10px] text-gray-400">Gross</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-700">{totals.net || '—'}</p>
                          <p className="text-[10px] text-gray-400">Net</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-700">{totals.stableford || '—'}</p>
                          <p className="text-[10px] text-gray-400">Pts</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitScores}
                  disabled={!allHolesEntered || submitting}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Submitting...' : (scoreData?.playerA?.submitted || scoreData?.playerB?.submitted ? 'Update Scores' : 'Submit Scores')}
                </button>
                <button
                  onClick={() => setShowUploadFallback(!showUploadFallback)}
                  className="p-3 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>

              {showUploadFallback && (
                <div className="mt-3 bg-gray-50 border rounded-lg p-3 text-sm text-gray-500">
                  Can't use digital scoring? Close this and use "Submit Result" on your dashboard to upload a scorecard photo.
                </div>
              )}

              {!scoreData?.bothSubmitted && (scoreData?.playerA?.submitted || scoreData?.playerB?.submitted) && (
                <div className="mt-3 bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm">
                  Waiting for {opponentName} to submit their scores...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUMMARY MODE — Full scorecard table view ── */}
        {mode === 'summary' && (
          <div className="p-4">
            <h4 className="font-bold text-sm mb-3 text-gray-700">Full Scorecard</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-green-50">
                    <th className="px-2 py-1.5 text-left font-bold text-green-800 w-14">Hole</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i + 1} className="px-1 py-1.5 text-center font-bold text-green-800 w-8">{i + 1}</th>
                    ))}
                    <th className="px-1 py-1.5 text-center font-bold text-green-800 bg-green-100 w-8">Out</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i + 10} className="px-1 py-1.5 text-center font-bold text-green-800 w-8">{i + 10}</th>
                    ))}
                    <th className="px-1 py-1.5 text-center font-bold text-green-800 bg-green-100 w-8">In</th>
                    <th className="px-1 py-1.5 text-center font-bold text-green-800 bg-green-200 w-8">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Par row */}
                  <tr className="border-t">
                    <td className="px-2 py-1 font-medium text-gray-600">Par</td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 1);
                      return <td key={i + 1} className="px-1 py-1 text-center">{h?.par || ''}</td>;
                    })}
                    <td className="px-1 py-1 text-center font-bold bg-green-50">
                      {holes.filter(h => h.holeNumber <= 9).reduce((s, h) => s + (h.par || 0), 0)}
                    </td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 10);
                      return <td key={i + 10} className="px-1 py-1 text-center">{h?.par || ''}</td>;
                    })}
                    <td className="px-1 py-1 text-center font-bold bg-green-50">
                      {holes.filter(h => h.holeNumber > 9).reduce((s, h) => s + (h.par || 0), 0)}
                    </td>
                    <td className="px-1 py-1 text-center font-bold bg-green-100">
                      {holes.reduce((s, h) => s + (h.par || 0), 0)}
                    </td>
                  </tr>

                  {/* SI row */}
                  <tr className="border-t">
                    <td className="px-2 py-1 font-medium text-gray-400 text-[10px]">S.I.</td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 1);
                      return <td key={i + 1} className="px-1 py-1 text-center text-gray-400 text-[10px]">{h?.strokeIndex || '—'}</td>;
                    })}
                    <td className="bg-green-50"></td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 10);
                      return <td key={i + 10} className="px-1 py-1 text-center text-gray-400 text-[10px]">{h?.strokeIndex || '—'}</td>;
                    })}
                    <td className="bg-green-50"></td>
                    <td className="bg-green-100"></td>
                  </tr>

                  {/* Score rows per player */}
                  {players.map(p => {
                    const scores = allScores[p.id] || {};
                    const strokes = playerStrokes[p.id] || {};
                    let front = 0, back = 0;
                    return (
                      <tr key={p.id} className={`border-t ${p.color.light}`}>
                        <td className="px-2 py-1">
                          <span className="flex items-center gap-1">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${p.color.bg} ${p.color.text}`}>
                              {p.initials}
                            </span>
                          </span>
                        </td>
                        {[...Array(9)].map((_, i) => {
                          const hNum = i + 1;
                          const s = scores[hNum];
                          const hData = holes.find(x => x.holeNumber === hNum);
                          const par = hData?.par || 4;
                          const extra = strokes[hNum] || 0;
                          if (s && s !== 'PU') front += s;
                          return (
                            <td key={hNum} className="px-0 py-0.5 text-center">
                              {s === 'PU' ? (
                                <span className="text-[10px] text-amber-600 font-bold">PU</span>
                              ) : s ? (
                                <ScoreMarking score={s} par={par} extraStrokes={extra}>
                                  <span className="text-xs">{s}</span>
                                </ScoreMarking>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-1 py-1 text-center font-bold bg-green-50/50 text-xs">{front || ''}</td>
                        {[...Array(9)].map((_, i) => {
                          const hNum = i + 10;
                          const s = scores[hNum];
                          const hData = holes.find(x => x.holeNumber === hNum);
                          const par = hData?.par || 4;
                          const extra = strokes[hNum] || 0;
                          if (s && s !== 'PU') back += s;
                          return (
                            <td key={hNum} className="px-0 py-0.5 text-center">
                              {s === 'PU' ? (
                                <span className="text-[10px] text-amber-600 font-bold">PU</span>
                              ) : s ? (
                                <ScoreMarking score={s} par={par} extraStrokes={extra}>
                                  <span className="text-xs">{s}</span>
                                </ScoreMarking>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-1 py-1 text-center font-bold bg-green-50/50 text-xs">{back || ''}</td>
                        <td className="px-1 py-1 text-center font-bold bg-green-100/50 text-xs">{(front + back) || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals summary cards */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {players.map(p => {
                const totals = playerTotals[p.id] || {};
                return (
                  <div key={p.id} className={`rounded-lg p-3 ${p.color.light} border`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${p.color.bg} ${p.color.text}`}>
                        {p.initials}
                      </span>
                      <span className="text-xs font-medium">{p.firstName} {p.lastName}</span>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div><p className="text-xl font-bold">{totals.gross || '—'}</p><p className="text-[10px] text-gray-400">Gross</p></div>
                      <div><p className="text-xl font-bold text-purple-700">{totals.net || '—'}</p><p className="text-[10px] text-gray-400">Net</p></div>
                      <div><p className="text-xl font-bold text-amber-700">{totals.stableford || '—'}</p><p className="text-[10px] text-gray-400">Stableford</p></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scoring legend */}
            <div className="mt-4 border-t pt-3">
              <p className="text-xs text-gray-400 mb-2 font-medium">Score markings</p>
              <div className="flex items-center gap-4 flex-wrap text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <ScoreMarking score={2} par={4} extraStrokes={0}><span className="text-[10px]">2</span></ScoreMarking>
                  Eagle
                </span>
                <span className="flex items-center gap-1">
                  <ScoreMarking score={3} par={4} extraStrokes={0}><span className="text-[10px]">3</span></ScoreMarking>
                  Birdie
                </span>
                <span className="flex items-center gap-1">
                  <ScoreMarking score={4} par={4} extraStrokes={0}><span className="text-[10px]">4</span></ScoreMarking>
                  Par
                </span>
                <span className="flex items-center gap-1">
                  <ScoreMarking score={5} par={4} extraStrokes={0}><span className="text-[10px]">5</span></ScoreMarking>
                  Bogey
                </span>
                <span className="flex items-center gap-1">
                  <ScoreMarking score={6} par={4} extraStrokes={0}><span className="text-[10px]">6</span></ScoreMarking>
                  Dbl Bogey+
                </span>
              </div>
            </div>

            <button
              onClick={() => setMode('entry')}
              className="mt-4 w-full py-3 rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 transition"
            >
              Back to Score Entry
            </button>
          </div>
        )}

        {/* ── COMPARISON MODE ── */}
        {mode === 'comparison' && scoreData?.bothSubmitted && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-green-50">
                    <th className="px-2 py-1.5 text-left font-bold text-green-800 w-16">Hole</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i + 1} className="px-1 py-1.5 text-center font-bold text-green-800">{i + 1}</th>
                    ))}
                    <th className="px-1 py-1.5 text-center font-bold bg-green-100">Out</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i + 10} className="px-1 py-1.5 text-center font-bold text-green-800">{i + 10}</th>
                    ))}
                    <th className="px-1 py-1.5 text-center font-bold bg-green-100">In</th>
                    <th className="px-1 py-1.5 text-center font-bold bg-green-200">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Par */}
                  <tr className="border-t">
                    <td className="px-2 py-1 font-medium text-gray-600">Par</td>
                    {holes.filter(h => h.holeNumber <= 9).map(h => (
                      <td key={h.holeNumber} className="px-1 py-1 text-center">{h.par}</td>
                    ))}
                    <td className="text-center font-bold bg-green-50">{holes.filter(h => h.holeNumber <= 9).reduce((s, h) => s + h.par, 0)}</td>
                    {holes.filter(h => h.holeNumber > 9).map(h => (
                      <td key={h.holeNumber} className="px-1 py-1 text-center">{h.par}</td>
                    ))}
                    <td className="text-center font-bold bg-green-50">{holes.filter(h => h.holeNumber > 9).reduce((s, h) => s + h.par, 0)}</td>
                    <td className="text-center font-bold bg-green-100">{holes.reduce((s, h) => s + h.par, 0)}</td>
                  </tr>

                  {/* Player scores with markings */}
                  {players.map(p => (
                    <tr key={p.id} className={`border-t ${p.color.light}`}>
                      <td className="px-2 py-1">
                        <span className="flex items-center gap-1">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${p.color.bg} ${p.color.text}`}>
                            {p.initials}
                          </span>
                          <span className="text-[10px] font-medium">{p.firstName}</span>
                        </span>
                      </td>
                      {renderComparisonPlayerRow(holes, p)}
                    </tr>
                  ))}

                  {/* Matchplay Running Result */}
                  <tr className="border-t bg-amber-50">
                    <td className="px-2 py-1 font-bold text-amber-800">Match</td>
                    {renderMatchplayRow(holes)}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Matchplay Result */}
            {scoreData.matchplayResult && (
              <div className="mt-4 bg-gradient-to-r from-green-800 to-green-900 text-white rounded-lg p-4 text-center">
                <p className="text-sm opacity-80">Match Result</p>
                <p className="text-2xl font-bold mt-1">
                  {scoreData.matchplayResult.winner === (isPlayerA ? 'A' : 'B')
                    ? `You won ${scoreData.matchplayResult.text}`
                    : scoreData.matchplayResult.winner
                      ? `${opponentName} won ${scoreData.matchplayResult.text}`
                      : scoreData.matchplayResult.text}
                </p>
              </div>
            )}

            {/* Totals Comparison */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {players.map(p => {
                const totals = p.handicapData?.totals || playerTotals[p.id] || {};
                return (
                  <div key={p.id} className={`${p.color.light} rounded-lg p-4 text-center border`}>
                    <p className="text-sm text-gray-600 font-medium">{p.firstName} {p.lastName}</p>
                    <div className="flex justify-center gap-5 mt-2">
                      <div><p className="text-xl font-bold">{totals.gross || '—'}</p><p className="text-xs text-gray-500">Gross</p></div>
                      <div><p className="text-xl font-bold text-purple-700">{totals.net || '—'}</p><p className="text-xs text-gray-500">Net</p></div>
                      <div><p className="text-xl font-bold text-amber-700">{totals.stableford || '—'}</p><p className="text-xs text-gray-500">Pts</p></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cross-Check Status */}
            {scoreData.crossCheck && (
              <div className={`mt-4 rounded-lg p-4 ${scoreData.crossCheck.allMatch ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                {scoreData.crossCheck.allMatch ? (
                  <div className="text-center">
                    <p className="font-bold text-green-800">All scores match</p>
                    <p className="text-sm text-green-600 mt-1">Both players recorded the same scores — ready to confirm.</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-amber-800 mb-2">Score discrepancies found</p>
                    <ul className="space-y-1">
                      {scoreData.crossCheck.mismatches.map((m, i) => (
                        <li key={i} className="text-sm text-amber-700 bg-amber-100 rounded px-2 py-1">
                          <strong>Hole {m.holeNumber}:</strong> {m.description}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-600 mt-2">You can accept the scores as-is or raise a dispute for admin review.</p>
                  </div>
                )}
              </div>
            )}

            {/* Accept / Dispute */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleAcceptScores}
                disabled={submitting}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {submitting ? 'Processing...' : 'Accept Scores & Confirm'}
              </button>
              <button
                onClick={() => setMode('dispute')}
                className="px-5 py-3 border-2 border-red-200 text-red-700 hover:bg-red-50 rounded-lg font-medium transition flex items-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Dispute
              </button>
            </div>
          </div>
        )}

        {/* ── DISPUTE MODE ── */}
        {mode === 'dispute' && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Dispute Scores
              </h4>
              <p className="text-sm text-red-700 mb-3">
                If you disagree with your opponent's submitted scores, describe the issue below.
                An admin will review both scorecards and resolve the dispute.
              </p>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
                placeholder="Describe which holes you disagree on and what you believe the correct scores are..."
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none"
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleDispute}
                  disabled={!disputeReason.trim() || submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
                <button
                  onClick={() => setMode('comparison')}
                  className="px-6 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Score Popup ── */}
      {scorePopup && (() => {
        const p = players[scorePopup.playerIndex];
        return (
          <ScorePopup
            holePar={holePar}
            onSelect={handleScoreSelect}
            onPickUp={handlePickUp}
            showPickUp={showPickUp}
            onClose={() => setScorePopup(null)}
            playerName={`${p.firstName} ${p.lastName}`}
            playerColor={p.color}
          />
        );
      })()}
    </div>
  );

  function renderComparisonPlayerRow(holes, p) {
    const cells = [];
    let frontTotal = 0, backTotal = 0;
    const playerKey = p.key;

    for (let h = 1; h <= 18; h++) {
      const holeData = holes.find(x => x.holeNumber === h);
      const data = holeData?.[playerKey];

      if (h === 10) {
        cells.push(<td key="out" className="text-center font-bold bg-green-50">{frontTotal || ''}</td>);
      }

      if (data) {
        const diff = data.net - (holeData?.par || 4);
        const extra = (playerStrokes[p.id] || {})[h] || 0;
        cells.push(
          <td key={h} className="px-0 py-0.5 text-center">
            <ScoreMarking score={data.gross} par={holeData?.par || 4} extraStrokes={extra}>
              <span className="text-xs font-bold">{data.gross}</span>
            </ScoreMarking>
          </td>
        );
        if (h <= 9) frontTotal += data.gross;
        else backTotal += data.gross;
      } else {
        cells.push(<td key={h} className="px-1 py-1 text-center">—</td>);
      }
    }

    cells.push(<td key="in" className="text-center font-bold bg-green-50">{backTotal || ''}</td>);
    cells.push(<td key="total" className="text-center font-bold bg-green-100">{(frontTotal + backTotal) || ''}</td>);
    return cells;
  }

  function renderMatchplayRow(holes) {
    const cells = [];
    let aUp = 0;

    for (let h = 1; h <= 18; h++) {
      const holeData = holes.find(x => x.holeNumber === h);

      if (h === 10) cells.push(<td key="out" className="bg-amber-50"></td>);

      if (holeData?.matchplayResult) {
        if (holeData.matchplayResult === 'A') aUp += (isPlayerA ? 1 : -1);
        else if (holeData.matchplayResult === 'B') aUp += (isPlayerA ? -1 : 1);

        const cls = aUp > 0 ? 'text-green-700 font-bold' : aUp < 0 ? 'text-red-700 font-bold' : 'text-gray-500';
        cells.push(
          <td key={h} className={`px-1 py-1 text-center ${cls}`}>
            {aUp > 0 ? `${aUp}↑` : aUp < 0 ? `${Math.abs(aUp)}↓` : 'AS'}
          </td>
        );
      } else {
        cells.push(<td key={h} className="px-1 py-1 text-center">—</td>);
      }
    }

    cells.push(<td key="in" className="bg-amber-50"></td>);
    cells.push(<td key="total" className="bg-amber-100 text-center font-bold">
      {aUp > 0 ? `${aUp} UP` : aUp < 0 ? `${Math.abs(aUp)} DN` : 'AS'}
    </td>);
    return cells;
  }
}

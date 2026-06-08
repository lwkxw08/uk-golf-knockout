import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { Upload, Check, AlertTriangle, X } from 'lucide-react';

/**
 * Calculate course handicap from handicap index and slope rating.
 */
function calcCourseHandicap(handicapIndex, slopeRating) {
  return Math.round(handicapIndex * (slopeRating / 113));
}

function calcPlayingHandicap(courseHandicap, allowancePct) {
  return Math.round(courseHandicap * (allowancePct / 100));
}

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

function scoreLabel(diff) {
  if (diff <= -3) return { text: 'Alb', cls: 'bg-yellow-400 text-yellow-900' };
  if (diff === -2) return { text: 'Eagle', cls: 'bg-yellow-200 text-yellow-800' };
  if (diff === -1) return { text: 'Birdie', cls: 'bg-green-200 text-green-800' };
  if (diff === 0) return { text: 'Par', cls: 'bg-gray-100 text-gray-600' };
  if (diff === 1) return { text: 'Bogey', cls: 'bg-red-100 text-red-700' };
  if (diff === 2) return { text: 'Dbl', cls: 'bg-red-200 text-red-800' };
  return { text: `+${diff}`, cls: 'bg-red-300 text-red-900' };
}

export default function DigitalScorecard({ match, player, onClose, onCompleted }) {
  const [scoreData, setScoreData] = useState(null);
  const [myScores, setMyScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('entry'); // entry | comparison | dispute
  const [disputeReason, setDisputeReason] = useState('');
  const [showUploadFallback, setShowUploadFallback] = useState(false);

  useEffect(() => {
    loadScoreData();
  }, [match.id]);

  async function loadScoreData() {
    try {
      const data = await api.get(`/scoring/${match.id}/scores`);
      setScoreData(data);
      // Pre-fill if I already submitted
      const isA = match.playerAId === player.id;
      const mySubmitted = isA ? data.playerA?.submitted : data.playerB?.submitted;
      if (mySubmitted) {
        const myHoles = {};
        data.holes.forEach(h => {
          const myData = isA ? h.playerA : h.playerB;
          if (myData) myHoles[h.holeNumber] = myData.gross;
        });
        setMyScores(myHoles);
        setMode(data.bothSubmitted ? 'comparison' : 'entry');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const isPlayerA = match.playerAId === player.id;
  const myHandicapData = scoreData ? (isPlayerA ? scoreData.playerA : scoreData.playerB) : null;
  const opponentData = scoreData ? (isPlayerA ? scoreData.playerB : scoreData.playerA) : null;
  const stablefordConfig = scoreData?.stablefordConfig || DEFAULT_STABLEFORD;
  const holes = scoreData?.holes || [];
  const tee = scoreData?.tee;

  // Calculate my strokes per hole
  const myStrokes = useMemo(() => {
    if (!myHandicapData || !holes.length) return {};
    return distributeStrokes(myHandicapData.playingHandicap, holes.map(h => ({ holeNumber: h.holeNumber, strokeIndex: h.strokeIndex })));
  }, [myHandicapData, holes]);

  // Compute running totals
  const myTotals = useMemo(() => {
    let gross = 0, net = 0, stableford = 0;
    for (let h = 1; h <= 18; h++) {
      if (myScores[h]) {
        const holeData = holes.find(x => x.holeNumber === h);
        const par = holeData?.par || 4;
        const extra = myStrokes[h] || 0;
        gross += myScores[h];
        net += myScores[h] - extra;
        stableford += calcStablefordPoints(myScores[h], par, extra, stablefordConfig);
      }
    }
    return { gross, net, stableford };
  }, [myScores, holes, myStrokes, stablefordConfig]);

  const allHolesEntered = Object.keys(myScores).length === 18 && Object.values(myScores).every(v => v > 0);

  async function handleSubmitScores() {
    if (!allHolesEntered) { setError('Please enter a score for all 18 holes'); return; }
    setSubmitting(true);
    setError('');
    try {
      const scores = Object.entries(myScores).map(([hole, score]) => ({
        holeNumber: Number(hole),
        score: Number(score),
      }));

      const alreadySubmitted = isPlayerA ? scoreData.playerA?.submitted : scoreData.playerB?.submitted;
      if (alreadySubmitted) {
        await api.put(`/scoring/${match.id}/scores`, { scores });
      } else {
        await api.post(`/scoring/${match.id}/scores`, { scores });
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

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-center">Loading scorecard...</div>
    </div>
  );

  const opponent = isPlayerA ? match.playerB : match.playerA;
  const opponentName = opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Opponent';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-lg">Digital Scorecard</h3>
            <p className="text-sm text-gray-500">
              {match.tournament?.name} — vs {opponentName}
              {tee && <span className="ml-2 text-green-700">({tee.teeName} tees, SR {tee.slopeRating})</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Handicap Info Bar */}
        {myHandicapData && (
          <div className="px-4 py-2 bg-blue-50 border-b flex flex-wrap gap-4 text-sm">
            <span>Handicap Index: <strong>{myHandicapData.handicapIndex}</strong></span>
            <span>Course Hcp: <strong>{myHandicapData.courseHandicap}</strong></span>
            <span>Playing Hcp ({scoreData.handicapAllowancePct}%): <strong>{myHandicapData.playingHandicap}</strong></span>
          </div>
        )}

        {error && <div className="mx-4 mt-3 bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

        {/* Tab Buttons */}
        <div className="px-4 pt-3 flex gap-2">
          <button
            onClick={() => setMode('entry')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${mode === 'entry' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Enter Scores
          </button>
          {scoreData?.bothSubmitted && (
            <button
              onClick={() => setMode('comparison')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${mode === 'comparison' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Compare Scores
            </button>
          )}
          <button
            onClick={() => setShowUploadFallback(!showUploadFallback)}
            className="ml-auto px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Upload className="w-3 h-3" /> Upload Physical Card
          </button>
        </div>

        {/* Score Entry Mode */}
        {mode === 'entry' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-green-50">
                    <th className="px-2 py-1.5 text-left font-bold text-green-800 w-16">Hole</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i + 1} className="px-1 py-1.5 text-center font-bold text-green-800 w-10">{i + 1}</th>
                    ))}
                    <th className="px-1 py-1.5 text-center font-bold text-green-800 bg-green-100 w-10">Out</th>
                    {[...Array(9)].map((_, i) => (
                      <th key={i + 10} className="px-1 py-1.5 text-center font-bold text-green-800 w-10">{i + 10}</th>
                    ))}
                    <th className="px-1 py-1.5 text-center font-bold text-green-800 bg-green-100 w-10">In</th>
                    <th className="px-1 py-1.5 text-center font-bold text-green-800 bg-green-200 w-10">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Par Row */}
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

                  {/* S.I. Row */}
                  <tr className="border-t">
                    <td className="px-2 py-1 font-medium text-gray-600">S.I.</td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 1);
                      return <td key={i + 1} className="px-1 py-1 text-center text-gray-400">{h?.strokeIndex || '—'}</td>;
                    })}
                    <td className="bg-green-50"></td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 10);
                      return <td key={i + 10} className="px-1 py-1 text-center text-gray-400">{h?.strokeIndex || '—'}</td>;
                    })}
                    <td className="bg-green-50"></td>
                    <td className="bg-green-100"></td>
                  </tr>

                  {/* Strokes Received Row */}
                  <tr className="border-t bg-blue-50/50">
                    <td className="px-2 py-1 font-medium text-blue-600 text-[10px]">Strokes</td>
                    {[...Array(9)].map((_, i) => (
                      <td key={i + 1} className="px-1 py-1 text-center text-blue-600">
                        {myStrokes[i + 1] > 0 ? myStrokes[i + 1] : ''}
                      </td>
                    ))}
                    <td className="bg-blue-50"></td>
                    {[...Array(9)].map((_, i) => (
                      <td key={i + 10} className="px-1 py-1 text-center text-blue-600">
                        {myStrokes[i + 10] > 0 ? myStrokes[i + 10] : ''}
                      </td>
                    ))}
                    <td className="bg-blue-50"></td>
                    <td className="bg-blue-100 text-center text-blue-700 font-bold">{myHandicapData?.playingHandicap || 0}</td>
                  </tr>

                  {/* Score Entry Row */}
                  <tr className="border-t border-green-300">
                    <td className="px-2 py-1 font-bold text-green-800">Score</td>
                    {[...Array(9)].map((_, i) => (
                      <td key={i + 1} className="px-0.5 py-1 text-center">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={myScores[i + 1] || ''}
                          onChange={(e) => setMyScores(prev => ({ ...prev, [i + 1]: e.target.value ? Number(e.target.value) : '' }))}
                          className="w-9 text-center border rounded px-0.5 py-1 text-sm font-bold focus:ring-2 focus:ring-green-400 outline-none"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center font-bold bg-green-50">
                      {Object.entries(myScores).filter(([h]) => Number(h) <= 9).reduce((s, [, v]) => s + (v || 0), 0) || ''}
                    </td>
                    {[...Array(9)].map((_, i) => (
                      <td key={i + 10} className="px-0.5 py-1 text-center">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={myScores[i + 10] || ''}
                          onChange={(e) => setMyScores(prev => ({ ...prev, [i + 10]: e.target.value ? Number(e.target.value) : '' }))}
                          className="w-9 text-center border rounded px-0.5 py-1 text-sm font-bold focus:ring-2 focus:ring-green-400 outline-none"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center font-bold bg-green-50">
                      {Object.entries(myScores).filter(([h]) => Number(h) > 9).reduce((s, [, v]) => s + (v || 0), 0) || ''}
                    </td>
                    <td className="px-1 py-1 text-center font-bold bg-green-100 text-lg">{myTotals.gross || ''}</td>
                  </tr>

                  {/* Stableford Points Row */}
                  <tr className="border-t">
                    <td className="px-2 py-1 font-medium text-amber-700">Pts</td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 1);
                      const score = myScores[i + 1];
                      if (!score || !h) return <td key={i + 1} className="px-1 py-1 text-center">—</td>;
                      const pts = calcStablefordPoints(score, h.par, myStrokes[i + 1] || 0, stablefordConfig);
                      return <td key={i + 1} className="px-1 py-1 text-center font-medium text-amber-700">{pts}</td>;
                    })}
                    <td className="px-1 py-1 text-center font-bold bg-amber-50 text-amber-800">
                      {Object.entries(myScores).filter(([h]) => Number(h) <= 9).reduce((s, [h, v]) => {
                        const hd = holes.find(x => x.holeNumber === Number(h));
                        return s + (v && hd ? calcStablefordPoints(v, hd.par, myStrokes[Number(h)] || 0, stablefordConfig) : 0);
                      }, 0) || ''}
                    </td>
                    {[...Array(9)].map((_, i) => {
                      const h = holes.find(x => x.holeNumber === i + 10);
                      const score = myScores[i + 10];
                      if (!score || !h) return <td key={i + 10} className="px-1 py-1 text-center">—</td>;
                      const pts = calcStablefordPoints(score, h.par, myStrokes[i + 10] || 0, stablefordConfig);
                      return <td key={i + 10} className="px-1 py-1 text-center font-medium text-amber-700">{pts}</td>;
                    })}
                    <td className="px-1 py-1 text-center font-bold bg-amber-50 text-amber-800">
                      {Object.entries(myScores).filter(([h]) => Number(h) > 9).reduce((s, [h, v]) => {
                        const hd = holes.find(x => x.holeNumber === Number(h));
                        return s + (v && hd ? calcStablefordPoints(v, hd.par, myStrokes[Number(h)] || 0, stablefordConfig) : 0);
                      }, 0) || ''}
                    </td>
                    <td className="px-1 py-1 text-center font-bold bg-amber-100 text-amber-900 text-lg">{myTotals.stableford || ''}</td>
                  </tr>

                  {/* Net Score Visual */}
                  <tr className="border-t">
                    <td className="px-2 py-1 font-medium text-purple-600">Net</td>
                    {[...Array(18)].map((_, i) => {
                      const holeNum = i + 1;
                      const h = holes.find(x => x.holeNumber === holeNum);
                      const score = myScores[holeNum];
                      if (!score || !h) return <td key={holeNum} className="px-1 py-1 text-center">—</td>;
                      const net = score - (myStrokes[holeNum] || 0);
                      const diff = net - h.par;
                      const lbl = scoreLabel(diff);
                      return (
                        <td key={holeNum} className="px-1 py-1 text-center">
                          <span className={`inline-block px-1 rounded text-[10px] font-medium ${lbl.cls}`}>{net}</span>
                        </td>
                      );
                    }).reduce((acc, td, i) => {
                      acc.push(td);
                      if (i === 8) acc.push(<td key="out-net" className="bg-purple-50 text-center font-bold text-purple-700">{
                        Object.entries(myScores).filter(([h]) => Number(h) <= 9).reduce((s, [h, v]) => s + (v || 0) - (myStrokes[Number(h)] || 0), 0) || ''
                      }</td>);
                      if (i === 17) {
                        acc.push(<td key="in-net" className="bg-purple-50 text-center font-bold text-purple-700">{
                          Object.entries(myScores).filter(([h]) => Number(h) > 9).reduce((s, [h, v]) => s + (v || 0) - (myStrokes[Number(h)] || 0), 0) || ''
                        }</td>);
                        acc.push(<td key="tot-net" className="bg-purple-100 text-center font-bold text-purple-800">{myTotals.net || ''}</td>);
                      }
                      return acc;
                    }, [])}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary + Submit */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{myTotals.gross || '—'}</p>
                  <p className="text-xs text-gray-500">Gross</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-700">{myTotals.net || '—'}</p>
                  <p className="text-xs text-gray-500">Net</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-700">{myTotals.stableford || '—'}</p>
                  <p className="text-xs text-gray-500">Stableford</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitScores}
                  disabled={!allHolesEntered || submitting}
                  className="bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Submitting...' : (scoreData?.playerA?.submitted || scoreData?.playerB?.submitted ? 'Update Scores' : 'Submit Scores')}
                </button>
              </div>
            </div>

            {!scoreData?.bothSubmitted && (scoreData?.playerA?.submitted || scoreData?.playerB?.submitted) && (
              <div className="mt-3 bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm">
                Waiting for {opponentName} to submit their scores...
              </div>
            )}
          </div>
        )}

        {/* Comparison Mode */}
        {mode === 'comparison' && scoreData?.bothSubmitted && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-green-50">
                    <th className="px-2 py-1.5 text-left font-bold text-green-800 w-20">Hole</th>
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

                  {/* My Scores */}
                  <tr className="border-t bg-green-50/50">
                    <td className="px-2 py-1 font-bold text-green-800">You</td>
                    {renderPlayerScoreRow(holes, isPlayerA ? 'playerA' : 'playerB')}
                  </tr>

                  {/* Opponent Scores */}
                  <tr className="border-t">
                    <td className="px-2 py-1 font-bold text-blue-800">{opponentName.split(' ')[0]}</td>
                    {renderPlayerScoreRow(holes, isPlayerA ? 'playerB' : 'playerA')}
                  </tr>

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
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Your Totals</p>
                <div className="flex justify-center gap-6 mt-2">
                  <div><p className="text-xl font-bold">{myHandicapData?.totals?.gross}</p><p className="text-xs text-gray-500">Gross</p></div>
                  <div><p className="text-xl font-bold text-purple-700">{myHandicapData?.totals?.net}</p><p className="text-xs text-gray-500">Net</p></div>
                  <div><p className="text-xl font-bold text-amber-700">{myHandicapData?.totals?.stableford}</p><p className="text-xs text-gray-500">Stableford</p></div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">{opponentName}</p>
                <div className="flex justify-center gap-6 mt-2">
                  <div><p className="text-xl font-bold">{opponentData?.totals?.gross}</p><p className="text-xs text-gray-500">Gross</p></div>
                  <div><p className="text-xl font-bold text-purple-700">{opponentData?.totals?.net}</p><p className="text-xs text-gray-500">Net</p></div>
                  <div><p className="text-xl font-bold text-amber-700">{opponentData?.totals?.stableford}</p><p className="text-xs text-gray-500">Stableford</p></div>
                </div>
              </div>
            </div>

            {/* Accept / Dispute */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleAcceptScores}
                disabled={submitting}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {submitting ? 'Processing...' : 'Accept Scores & Confirm Result'}
              </button>
              <button
                onClick={() => setMode('dispute')}
                className="px-6 py-3 border-2 border-red-200 text-red-700 hover:bg-red-50 rounded-lg font-medium transition flex items-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Dispute
              </button>
            </div>
          </div>
        )}

        {/* Dispute Mode */}
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

        {/* Upload Fallback */}
        {showUploadFallback && (
          <div className="mx-4 mb-4 bg-gray-50 border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Can't use digital scoring? Upload a photo of your physical scorecard instead.</p>
            <p className="text-xs text-gray-400">Close this scorecard and use the "Submit Result" button on your dashboard to upload a scorecard image.</p>
          </div>
        )}
      </div>
    </div>
  );

  function renderPlayerScoreRow(holes, playerKey) {
    const cells = [];
    let frontTotal = 0, backTotal = 0;

    for (let h = 1; h <= 18; h++) {
      const holeData = holes.find(x => x.holeNumber === h);
      const data = holeData?.[playerKey];

      if (h === 10) {
        cells.push(<td key="out" className="text-center font-bold bg-green-50">{frontTotal || ''}</td>);
      }

      if (data) {
        const diff = data.net - (holeData?.par || 4);
        const lbl = scoreLabel(diff);
        cells.push(
          <td key={h} className="px-1 py-1 text-center">
            <span className={`inline-block w-6 rounded text-[10px] font-bold ${lbl.cls}`}>{data.gross}</span>
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

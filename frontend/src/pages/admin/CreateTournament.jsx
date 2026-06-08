import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Trophy, Plus, X, ChevronRight } from 'lucide-react';

const FORMAT_OPTIONS = [
  { value: 'SINGLES_MATCHPLAY', label: 'Singles Matchplay' },
  { value: 'SINGLES_STROKEPLAY', label: 'Singles Strokeplay' },
  { value: 'SINGLES_STABLEFORD', label: 'Singles Stableford' },
  { value: 'PAIRS_MATCHPLAY', label: 'Pairs Matchplay' },
  { value: 'PAIRS_BESTBALL', label: 'Pairs Best Ball' },
  { value: 'PAIRS_FOURSOMES', label: 'Pairs Foursomes' },
  { value: 'PAIRS_GREENSOMES', label: 'Pairs Greensomes' },
  { value: 'TEAM_MATCHPLAY', label: 'Team Matchplay' },
  { value: 'TEAM_STROKEPLAY', label: 'Team Strokeplay' },
  { value: 'TEAM_STABLEFORD', label: 'Team Stableford' },
];

const SCORING_OPTIONS = [
  { value: 'MATCHPLAY', label: 'Matchplay' },
  { value: 'STROKEPLAY', label: 'Strokeplay' },
  { value: 'STABLEFORD', label: 'Stableford' },
  { value: 'BEST_BALL', label: 'Best Ball' },
];

const STAGE_TYPES = [
  { value: 'CLUB_QUALIFIER', label: 'Club Qualifier' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'NATIONAL_FINAL', label: 'National Final' },
];

export default function CreateTournament() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    season: new Date().getFullYear().toString(),
    description: '',
    rulesText: '',
    formatType: 'SINGLES_MATCHPLAY',
    scoringSystem: 'MATCHPLAY',
    teamSize: 1,
    isKnockout: true,
    handicapAllowancePct: 100,
    maxHandicap: '',
    ageCategory: 'OPEN',
    genderCategory: 'MIXED',
    minAge: '',
    maxAge: '',
    enableLeaderboard: false,
    registrationOpens: '',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    entryFeePence: 2500,
    clubSharePct: 50,
    platformSharePct: 50,
  });

  const [stages, setStages] = useState([]);
  const [overallPrizes, setOverallPrizes] = useState([]);

  useEffect(() => {
    api.get('/admin/regions').then(setRegions).catch(() => {});
  }, []);

  const update = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (field === 'name') {
      setForm(prev => ({
        ...prev,
        name: val,
        slug: String(val).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    } else {
      setForm(prev => ({ ...prev, [field]: val }));
    }
  };

  const tempIdCounter = useRef(1);
  const genTempId = () => `stage-${tempIdCounter.current++}`;

  const addStage = (type = 'CLUB_QUALIFIER') => {
    const lbl = STAGE_TYPES.find(t => t.value === type)?.label || type;
    const count = stages.filter(s => s.stage === type).length;
    const name = count > 0 ? `${lbl} ${count + 1}` : lbl;
    setStages([...stages, {
      tempId: genTempId(),
      stage: type,
      name,
      stageOrder: stages.length + 1,
      maxParticipants: type === 'CLUB_QUALIFIER' ? 32 : type === 'REGIONAL' ? 16 : 8,
      qualifyCount: type === 'NATIONAL_FINAL' ? 0 : 1,
      matchDeadlineDays: null,
      feedsIntoTempId: '',
      regionIds: [],
      prizes: [],
    }]);
  };

  const removeStage = (idx) => {
    const removedId = stages[idx].tempId;
    setStages(stages.filter((_, i) => i !== idx).map((s, i) => ({
      ...s,
      stageOrder: i + 1,
      feedsIntoTempId: s.feedsIntoTempId === removedId ? '' : s.feedsIntoTempId,
    })));
  };

  const updateStage = (idx, field, val) => {
    setStages(stages.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const toggleRegion = (stageIdx, regionId) => {
    const current = stages[stageIdx].regionIds;
    const updated = current.includes(regionId) ? current.filter(id => id !== regionId) : [...current, regionId];
    updateStage(stageIdx, 'regionIds', updated);
  };

  const calcRounds = (maxP) => maxP && maxP > 1 ? Math.ceil(Math.log2(maxP)) : 1;

  const addStagePrize = (stageIdx) => {
    const s = stages[stageIdx];
    updateStage(stageIdx, 'prizes', [...s.prizes, { position: s.prizes.length + 1, description: '', valuePence: 0, prizeType: 'trophy' }]);
  };

  const updateStagePrize = (stageIdx, prizeIdx, field, val) => {
    const updated = stages[stageIdx].prizes.map((p, i) => i === prizeIdx ? { ...p, [field]: val } : p);
    updateStage(stageIdx, 'prizes', updated);
  };

  const removeStagePrize = (stageIdx, prizeIdx) => {
    updateStage(stageIdx, 'prizes', stages[stageIdx].prizes.filter((_, i) => i !== prizeIdx));
  };

  const addOverallPrize = () => {
    setOverallPrizes([...overallPrizes, { position: overallPrizes.length + 1, description: '', valuePence: 0, prizeType: 'trophy' }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        teamSize: Number(form.teamSize),
        handicapAllowancePct: Number(form.handicapAllowancePct),
        maxHandicap: form.maxHandicap ? Number(form.maxHandicap) : null,
        minAge: form.minAge ? Number(form.minAge) : null,
        maxAge: form.maxAge ? Number(form.maxAge) : null,
        stages: stages.length > 0 ? stages : undefined,
        prizes: overallPrizes.length > 0 ? overallPrizes : undefined,
        pricing: [{
          feeType: 'ENTRY_FEE',
          amountPence: Number(form.entryFeePence),
          clubSharePct: Number(form.clubSharePct),
          platformSharePct: Number(form.platformSharePct),
          description: 'Entry fee',
        }],
      };
      delete payload.entryFeePence;
      delete payload.clubSharePct;
      delete payload.platformSharePct;

      await api.post('/tournaments', payload);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-green-700" />
        <h1 className="text-2xl font-bold text-gray-900">Create Tournament</h1>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Tournament Name *</label>
              <input type="text" required value={form.name} onChange={update('name')} className={input} />
            </div>
            <div>
              <label className={label}>URL Slug *</label>
              <input type="text" required value={form.slug} onChange={update('slug')} className={input} />
            </div>
            <div>
              <label className={label}>Season *</label>
              <input type="text" required value={form.season} onChange={update('season')} className={input} />
            </div>
            <div>
              <label className={label}>Age Category</label>
              <select value={form.ageCategory} onChange={update('ageCategory')} className={input}>
                <option value="OPEN">Open (All Ages)</option>
                <option value="JUNIOR">Junior Only</option>
                <option value="SENIOR">Senior Only</option>
              </select>
            </div>
            <div>
              <label className={label}>Gender</label>
              <select value={form.genderCategory} onChange={update('genderCategory')} className={input}>
                <option value="MIXED">Mixed</option>
                <option value="MEN">Men Only</option>
                <option value="WOMEN">Women Only</option>
              </select>
            </div>
            {form.ageCategory === 'JUNIOR' && (
              <div>
                <label className={label}>Maximum Age</label>
                <input type="number" value={form.maxAge} onChange={update('maxAge')} placeholder="e.g. 18" className={input} />
              </div>
            )}
            {form.ageCategory === 'SENIOR' && (
              <div>
                <label className={label}>Minimum Age</label>
                <input type="number" value={form.minAge} onChange={update('minAge')} placeholder="e.g. 55" className={input} />
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className={label}>Description</label>
            <textarea value={form.description} onChange={update('description')} rows={3} className={input} />
          </div>
          <div className="mt-4">
            <label className={label}>Rules</label>
            <textarea value={form.rulesText} onChange={update('rulesText')} rows={3} className={input} />
          </div>
        </div>

        {/* Format */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Playing Format</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Format Type *</label>
              <select value={form.formatType} onChange={update('formatType')} className={input}>
                {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Scoring System *</label>
              <select value={form.scoringSystem} onChange={update('scoringSystem')} className={input}>
                {SCORING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Team Size</label>
              <input type="number" min="1" value={form.teamSize} onChange={update('teamSize')} className={input} />
            </div>
            <div>
              <label className={label}>Handicap Allowance %</label>
              <input type="number" min="0" max="100" value={form.handicapAllowancePct} onChange={update('handicapAllowancePct')} className={input} />
            </div>
            <div>
              <label className={label}>Max Handicap (blank = no limit)</label>
              <input type="number" step="0.1" value={form.maxHandicap} onChange={update('maxHandicap')} className={input} />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isKnockout} onChange={update('isKnockout')} className="w-4 h-4 text-green-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Knockout Format</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.enableLeaderboard} onChange={update('enableLeaderboard')} className="w-4 h-4 text-green-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Overall Leaderboard</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tournament Stages (Tree Structure) */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold">Tournament Stages</h2>
              <p className="text-sm text-gray-500 mt-1">Build your tournament pathway. Each stage feeds winners into the next stage.</p>
            </div>
          </div>

          {/* Add stage buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={() => addStage('CLUB_QUALIFIER')}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">
              <Plus className="w-3 h-3" /> Club Qualifier
            </button>
            <button type="button" onClick={() => addStage('REGIONAL')}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">
              <Plus className="w-3 h-3" /> Regional Round
            </button>
            <button type="button" onClick={() => addStage('NATIONAL_FINAL')}
              className="flex items-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">
              <Plus className="w-3 h-3" /> National Final
            </button>
          </div>

          {stages.length === 0 && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
              <p className="font-medium">No stages configured</p>
              <p className="text-sm mt-1">Default stages (Club &rarr; Regional &rarr; National) will be used. Add stages above to customise your tournament pathway.</p>
            </div>
          )}

          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const bgColor = stage.stage === 'CLUB_QUALIFIER' ? 'bg-blue-50' : stage.stage === 'REGIONAL' ? 'bg-amber-50' : 'bg-green-50';
              const borderColor = stage.stage === 'CLUB_QUALIFIER' ? 'border-blue-200' : stage.stage === 'REGIONAL' ? 'border-amber-200' : 'border-green-200';
              const badgeColor = stage.stage === 'CLUB_QUALIFIER' ? 'bg-blue-600' : stage.stage === 'REGIONAL' ? 'bg-amber-600' : 'bg-green-700';
              const rounds = calcRounds(stage.maxParticipants);
              // Stages this one can feed into (higher-order stages only)
              const feedTargets = stages.filter(s => s.tempId !== stage.tempId && (
                (stage.stage === 'CLUB_QUALIFIER' && (s.stage === 'REGIONAL' || s.stage === 'NATIONAL_FINAL')) ||
                (stage.stage === 'REGIONAL' && s.stage === 'NATIONAL_FINAL')
              ));

              return (
              <div key={stage.tempId || idx} className={`border ${borderColor} rounded-lg p-5 ${bgColor}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`${badgeColor} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                      {stage.stage === 'CLUB_QUALIFIER' ? 'CLUB' : stage.stage === 'REGIONAL' ? 'REGIONAL' : 'FINAL'}
                    </span>
                    <input type="text" value={stage.name}
                      onChange={(e) => updateStage(idx, 'name', e.target.value)}
                      className="font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 outline-none px-1" />
                  </div>
                  <button type="button" onClick={() => removeStage(idx)} className="text-red-500 hover:text-red-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className={label}>Max Participants</label>
                    <input type="number" min="2" value={stage.maxParticipants || ''} onChange={(e) => updateStage(idx, 'maxParticipants', e.target.value ? Number(e.target.value) : null)} className={input} placeholder="e.g. 32" />
                    <p className="text-xs text-gray-500 mt-1">
                      {stage.maxParticipants > 1 ? `${rounds} knockout round${rounds !== 1 ? 's' : ''} (R1${rounds > 1 ? ' → ' : ''}${rounds > 3 ? 'QF → ' : ''}${rounds > 2 ? 'SF → ' : ''}${rounds > 1 ? 'Final' : ''})` : 'Sets bracket size'}
                    </p>
                  </div>

                  {stage.stage !== 'NATIONAL_FINAL' ? (
                    <div>
                      <label className={label}>Places Qualify</label>
                      <input type="number" min="1" max="8" value={stage.qualifyCount} onChange={(e) => updateStage(idx, 'qualifyCount', Number(e.target.value))} className={input} />
                      <p className="text-xs text-gray-500 mt-1">How many progress to next stage</p>
                    </div>
                  ) : (
                    <div>
                      <label className={label}>Champion + Runner-up</label>
                      <div className="bg-white border rounded-lg px-3 py-2 text-sm text-gray-500">Final stage — determines winner</div>
                    </div>
                  )}

                  {stage.stage !== 'NATIONAL_FINAL' && feedTargets.length > 0 && (
                    <div>
                      <label className={label}>Feeds Winners Into</label>
                      <select value={stage.feedsIntoTempId || ''} onChange={(e) => updateStage(idx, 'feedsIntoTempId', e.target.value)} className={input}>
                        <option value="">Select target stage...</option>
                        {feedTargets.map(t => <option key={t.tempId} value={t.tempId}>{t.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={label}>Match Deadline (days)</label>
                    <input type="number" min="1" value={stage.matchDeadlineDays || ''} onChange={(e) => updateStage(idx, 'matchDeadlineDays', e.target.value ? Number(e.target.value) : null)} className={input} />
                  </div>
                </div>

                {/* Region selection for Regional stages */}
                {stage.stage === 'REGIONAL' && regions.length > 0 && (
                  <div className="mb-4">
                    <label className={label}>Region for this Round</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {regions.map(r => (
                        <button key={r.id} type="button" onClick={() => toggleRegion(idx, r.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                            stage.regionIds.includes(r.id) ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white border-gray-300 text-gray-600 hover:border-amber-400'
                          }`}>
                          {r.name} ({r._count?.clubs || 0} clubs)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stage Prizes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={label}>Prizes</label>
                    <button type="button" onClick={() => addStagePrize(idx)} className="text-green-700 hover:text-green-800 text-sm font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Prize
                    </button>
                  </div>
                  {stage.prizes.map((prize, pi) => (
                    <div key={pi} className="flex gap-2 mb-2 items-center">
                      <span className="text-sm font-medium text-gray-500 w-8">{prize.position}{prize.position === 1 ? 'st' : prize.position === 2 ? 'nd' : prize.position === 3 ? 'rd' : 'th'}</span>
                      <input type="text" placeholder="Prize description" value={prize.description} onChange={(e) => updateStagePrize(idx, pi, 'description', e.target.value)} className={`${input} flex-1`} />
                      <div className="w-28">
                        <input type="number" min="0" placeholder="Value (p)" value={prize.valuePence} onChange={(e) => updateStagePrize(idx, pi, 'valuePence', Number(e.target.value))} className={input} />
                      </div>
                      <select value={prize.prizeType} onChange={(e) => updateStagePrize(idx, pi, 'prizeType', e.target.value)} className={`${input} w-28`}>
                        <option value="trophy">Trophy</option>
                        <option value="cash">Cash</option>
                        <option value="voucher">Voucher</option>
                        <option value="equipment">Equipment</option>
                        <option value="trip">Trip</option>
                      </select>
                      <button type="button" onClick={() => removeStagePrize(idx, pi)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>

          {/* Visual pathway summary */}
          {stages.length > 1 && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-2">Tournament Pathway</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {stages.map((s, i) => {
                  const target = s.feedsIntoTempId ? stages.find(t => t.tempId === s.feedsIntoTempId) : null;
                  return (
                    <span key={s.tempId || i} className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        s.stage === 'CLUB_QUALIFIER' ? 'bg-blue-100 text-blue-700' :
                        s.stage === 'REGIONAL' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>{s.name}{s.maxParticipants ? ` (${s.maxParticipants})` : ''}</span>
                      {target && <ChevronRight className="w-3 h-3 text-gray-400" />}
                      {target && <span className="text-xs text-gray-500">{target.name}</span>}
                      {i < stages.length - 1 && <span className="text-gray-300 mx-1">|</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Overall Prizes (e.g. leaderboard prize) */}
        {form.enableLeaderboard && (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Overall Leaderboard Prizes</h2>
                <p className="text-sm text-gray-500 mt-1">Best adjusted score across all stages</p>
              </div>
              <button type="button" onClick={addOverallPrize} className="flex items-center gap-1 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Prize
              </button>
            </div>
            {overallPrizes.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <span className="text-sm font-medium text-gray-500 w-8">{p.position}{p.position === 1 ? 'st' : p.position === 2 ? 'nd' : 'rd'}</span>
                <input type="text" placeholder="Prize description" value={p.description} onChange={(e) => {
                  setOverallPrizes(overallPrizes.map((pp, ii) => ii === i ? { ...pp, description: e.target.value } : pp));
                }} className={`${input} flex-1`} />
                <input type="number" min="0" placeholder="Value (p)" value={p.valuePence} onChange={(e) => {
                  setOverallPrizes(overallPrizes.map((pp, ii) => ii === i ? { ...pp, valuePence: Number(e.target.value) } : pp));
                }} className={`${input} w-28`} />
                <button type="button" onClick={() => setOverallPrizes(overallPrizes.filter((_, ii) => ii !== i))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Dates */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Dates</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Registration Opens</label>
              <input type="datetime-local" value={form.registrationOpens} onChange={update('registrationOpens')} className={input} />
            </div>
            <div>
              <label className={label}>Registration Deadline</label>
              <input type="datetime-local" value={form.registrationDeadline} onChange={update('registrationDeadline')} className={input} />
            </div>
            <div>
              <label className={label}>Start Date</label>
              <input type="datetime-local" value={form.startDate} onChange={update('startDate')} className={input} />
            </div>
            <div>
              <label className={label}>End Date</label>
              <input type="datetime-local" value={form.endDate} onChange={update('endDate')} className={input} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Entry Fee & Revenue Split</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={label}>Entry Fee (pence) *</label>
              <input type="number" min="0" required value={form.entryFeePence} onChange={update('entryFeePence')} className={input} />
              <p className="text-xs text-gray-500 mt-1">&pound;{(form.entryFeePence / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className={label}>Club Share %</label>
              <input type="number" min="0" max="100" value={form.clubSharePct} onChange={(e) => {
                const club = Number(e.target.value);
                setForm(prev => ({ ...prev, clubSharePct: club, platformSharePct: 100 - club }));
              }} className={input} />
            </div>
            <div>
              <label className={label}>Platform Share %</label>
              <input type="number" min="0" max="100" value={form.platformSharePct} onChange={(e) => {
                const platform = Number(e.target.value);
                setForm(prev => ({ ...prev, platformSharePct: platform, clubSharePct: 100 - platform }));
              }} className={input} />
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              For a &pound;{(form.entryFeePence / 100).toFixed(2)} entry: Club receives &pound;{((form.entryFeePence * form.clubSharePct / 100) / 100).toFixed(2)} | Platform receives &pound;{((form.entryFeePence * form.platformSharePct / 100) / 100).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading}
            className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded-lg font-medium transition disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
          <button type="button" onClick={() => navigate('/admin')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-lg font-medium transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

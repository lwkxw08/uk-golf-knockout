import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

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

export default function CreateTournament() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    minAge: '',
    maxAge: '',
    registrationOpens: '',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    entryFeePence: 2500,
    clubSharePct: 50,
    platformSharePct: 50,
  });

  const update = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });

    if (field === 'name') {
      setForm(prev => ({
        ...prev,
        [field]: val,
        slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        season: form.season,
        description: form.description || undefined,
        rulesText: form.rulesText || undefined,
        formatType: form.formatType,
        scoringSystem: form.scoringSystem,
        teamSize: Number(form.teamSize),
        isKnockout: form.isKnockout,
        handicapAllowancePct: Number(form.handicapAllowancePct),
        maxHandicap: form.maxHandicap ? Number(form.maxHandicap) : undefined,
        ageCategory: form.ageCategory,
        minAge: form.minAge ? Number(form.minAge) : undefined,
        maxAge: form.maxAge ? Number(form.maxAge) : undefined,
        registrationOpens: form.registrationOpens || undefined,
        registrationDeadline: form.registrationDeadline || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        pricing: [{
          feeType: 'ENTRY_FEE',
          amountPence: Number(form.entryFeePence),
          clubSharePct: Number(form.clubSharePct),
          platformSharePct: Number(form.platformSharePct),
          description: 'Standard entry fee',
        }],
      };

      const tournament = await api.post('/tournaments', payload);
      navigate(`/admin/tournaments/${tournament.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Tournament</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {/* Basic Info */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name *</label>
              <input type="text" required value={form.name} onChange={update('name')}
                placeholder="e.g. 2027 UK Amateur Matchplay Championship"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
              <input type="text" required value={form.slug} onChange={update('slug')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Season *</label>
              <input type="text" required value={form.season} onChange={update('season')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age Category</label>
              <select value={form.ageCategory} onChange={update('ageCategory')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none">
                <option value="OPEN">Open (All Ages)</option>
                <option value="JUNIOR">Junior Only</option>
                <option value="SENIOR">Senior Only</option>
              </select>
            </div>
            {form.ageCategory === 'JUNIOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Age</label>
                <input type="number" value={form.maxAge} onChange={update('maxAge')}
                  placeholder="e.g. 18"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            )}
            {form.ageCategory === 'SENIOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Age</label>
                <input type="number" value={form.minAge} onChange={update('minAge')}
                  placeholder="e.g. 55"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={update('description')} rows={3}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rules</label>
            <textarea value={form.rulesText} onChange={update('rulesText')} rows={4}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>

        {/* Format */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Playing Format</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format Type *</label>
              <select value={form.formatType} onChange={update('formatType')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none">
                {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scoring System *</label>
              <select value={form.scoringSystem} onChange={update('scoringSystem')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none">
                {SCORING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
              <input type="number" min="1" value={form.teamSize} onChange={update('teamSize')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handicap Allowance %</label>
              <input type="number" min="0" max="100" value={form.handicapAllowancePct} onChange={update('handicapAllowancePct')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Handicap (blank = no limit)</label>
              <input type="number" step="0.1" value={form.maxHandicap} onChange={update('maxHandicap')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={form.isKnockout} onChange={update('isKnockout')} id="knockout"
                className="w-4 h-4 text-green-600 rounded" />
              <label htmlFor="knockout" className="text-sm font-medium text-gray-700">Knockout Format</label>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Dates</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Opens</label>
              <input type="datetime-local" value={form.registrationOpens} onChange={update('registrationOpens')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
              <input type="datetime-local" value={form.registrationDeadline} onChange={update('registrationDeadline')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="datetime-local" value={form.startDate} onChange={update('startDate')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="datetime-local" value={form.endDate} onChange={update('endDate')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Entry Fee & Revenue Split</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Fee (pence) *</label>
              <input type="number" min="0" required value={form.entryFeePence} onChange={update('entryFeePence')}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
              <p className="text-xs text-gray-500 mt-1">&pound;{(form.entryFeePence / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Club Share %</label>
              <input type="number" min="0" max="100" value={form.clubSharePct} onChange={(e) => {
                const club = Number(e.target.value);
                setForm({ ...form, clubSharePct: club, platformSharePct: 100 - club });
              }}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Share %</label>
              <input type="number" min="0" max="100" value={form.platformSharePct} onChange={(e) => {
                const platform = Number(e.target.value);
                setForm({ ...form, platformSharePct: platform, clubSharePct: 100 - platform });
              }}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
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

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Trophy, ArrowLeft, Save, Loader2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

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

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
  { value: 'REGISTRATION_CLOSED', label: 'Registration Closed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function toLocalDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function EditTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tournament, setTournament] = useState(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    season: '',
    description: '',
    rulesText: '',
    status: '',
    formatType: '',
    scoringSystem: '',
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
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get(`/tournaments/${id}`);
        setTournament(data);
        setForm({
          name: data.name || '',
          slug: data.slug || '',
          season: data.season || '',
          description: data.description || '',
          rulesText: data.rulesText || '',
          status: data.status || 'DRAFT',
          formatType: data.formatType || 'SINGLES_MATCHPLAY',
          scoringSystem: data.scoringSystem || 'MATCHPLAY',
          teamSize: data.teamSize || 1,
          isKnockout: data.isKnockout ?? true,
          handicapAllowancePct: data.handicapAllowancePct ?? 100,
          maxHandicap: data.maxHandicap ?? '',
          ageCategory: data.ageCategory || 'OPEN',
          genderCategory: data.genderCategory || 'MIXED',
          minAge: data.minAge ?? '',
          maxAge: data.maxAge ?? '',
          enableLeaderboard: data.enableLeaderboard ?? false,
          registrationOpens: toLocalDate(data.registrationOpens),
          registrationDeadline: toLocalDate(data.registrationDeadline),
          startDate: toLocalDate(data.startDate),
          endDate: toLocalDate(data.endDate),
        });
      } catch (err) {
        setError('Failed to load tournament');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        teamSize: Number(form.teamSize),
        handicapAllowancePct: Number(form.handicapAllowancePct),
        maxHandicap: form.maxHandicap ? Number(form.maxHandicap) : null,
        minAge: form.minAge ? Number(form.minAge) : null,
        maxAge: form.maxAge ? Number(form.maxAge) : null,
      };
      await api.put(`/tournaments/${id}`, payload);
      setSuccess('Tournament updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update tournament');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Edit Tournament" subtitle={tournament?.name || ''} icon={Trophy} gradient="green" compact />
      <div className="max-w-4xl mx-auto px-4 py-8">

      {tournament && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg px-4 py-3 mb-6 text-sm text-green-800 dark:text-green-300">
          Editing: <strong>{tournament.name}</strong> — {tournament._count?.entries || 0} entrants
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-6">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Status */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Tournament Status</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={update('status')} className={input}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Tournament Name *</label>
              <input type="text" required value={form.name} onChange={update('name')} className={input} />
            </div>
            <div>
              <label className={label}>URL Slug</label>
              <input type="text" value={form.slug} onChange={update('slug')} className={input} />
            </div>
            <div>
              <label className={label}>Season</label>
              <input type="text" value={form.season} onChange={update('season')} className={input} />
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
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Playing Format</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Format Type</label>
              <select value={form.formatType} onChange={update('formatType')} className={input}>
                {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Scoring System</label>
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Knockout Format</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.enableLeaderboard} onChange={update('enableLeaderboard')} className="w-4 h-4 text-green-600 rounded" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Leaderboard</span>
              </label>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Key Dates</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Registration Opens</label>
              <input type="date" value={form.registrationOpens} onChange={update('registrationOpens')} className={input} />
            </div>
            <div>
              <label className={label}>Registration Deadline</label>
              <input type="date" value={form.registrationDeadline} onChange={update('registrationDeadline')} className={input} />
            </div>
            <div>
              <label className={label}>Start Date</label>
              <input type="date" value={form.startDate} onChange={update('startDate')} className={input} />
            </div>
            <div>
              <label className={label}>End Date</label>
              <input type="date" value={form.endDate} onChange={update('endDate')} className={input} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition"
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Search } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isClub = searchParams.get('role') === 'club';

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [whsLookup, setWhsLookup] = useState({ loading: false, result: null });

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    handicapIndex: '',
    whsHandicapId: '',
    homeClubId: '',
  });

  useEffect(() => {
    api.get('/clubs?limit=100').then(data => setClubs(data.clubs || [])).catch(() => {});
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none';

  const handleStep1 = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: isClub ? 'CLUB_MANAGER' : 'PLAYER',
      });
      localStorage.setItem('token', data.token);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const profileData = {};
      if (form.phone) profileData.phone = form.phone;
      if (form.dateOfBirth) profileData.dateOfBirth = form.dateOfBirth;
      if (form.handicapIndex) profileData.handicapIndex = form.handicapIndex;
      if (form.whsHandicapId) profileData.whsHandicapId = form.whsHandicapId;
      if (form.homeClubId) profileData.homeClubId = form.homeClubId;

      await api.put('/players/me', profileData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800" />
      <div className="w-full max-w-md relative">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 p-8">
        <h1 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-2">
          {isClub ? 'Register Your Club' : 'Create Account'}
        </h1>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-green-700' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
        </div>
        <p className="text-center text-sm text-gray-500 mb-6">
          {step === 1 ? 'Account Details' : 'Complete Your Profile'}
        </p>

        {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" required value={form.firstName} onChange={update('firstName')} className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" required value={form.lastName} onChange={update('lastName')} className={input} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={update('email')} className={input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" required minLength={6} value={form.password} onChange={update('password')} className={input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <input type="password" required value={form.confirmPassword} onChange={update('confirmPassword')} className={input} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Creating account...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} className={input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WHS Handicap ID</label>
              <div className="flex gap-2">
                <input type="text" value={form.whsHandicapId} onChange={update('whsHandicapId')} placeholder="7-10 digit WHS ID" className={`${input} flex-1`} />
                <button
                  type="button"
                  disabled={!form.whsHandicapId || form.whsHandicapId.length < 7 || whsLookup.loading}
                  onClick={async () => {
                    setWhsLookup({ loading: true, result: null });
                    try {
                      const data = await api.get(`/courses/golfer/${form.whsHandicapId}`);
                      setWhsLookup({ loading: false, result: data });
                      if (data.available && data.handicapIndex != null) {
                        setForm(prev => ({ ...prev, handicapIndex: String(data.handicapIndex) }));
                      }
                    } catch {
                      setWhsLookup({ loading: false, result: { available: false, message: 'Lookup failed' } });
                    }
                  }}
                  className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition flex items-center gap-1"
                >
                  {whsLookup.loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Search className="w-3 h-3" /> Lookup</>
                  )}
                </button>
              </div>
              {whsLookup.result && (
                <div className={`mt-2 text-xs px-3 py-2 rounded ${whsLookup.result.available ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {whsLookup.result.available
                    ? `Found: ${whsLookup.result.firstName} ${whsLookup.result.lastName} — Handicap Index: ${whsLookup.result.handicapIndex}`
                    : (whsLookup.result.message || 'WHS lookup not available — enter handicap manually')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handicap Index</label>
              <input type="number" step="0.1" min="-10" max="54" value={form.handicapIndex} onChange={update('handicapIndex')} placeholder="e.g. 18.5" className={input} />
              {whsLookup.result?.available && <p className="text-xs text-green-600 mt-1">Auto-filled from WHS lookup</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Club</label>
              <select value={form.homeClubId} onChange={update('homeClubId')} className={input}>
                <option value="">Select club (optional)</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+44..." className={input} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                {loading ? 'Saving...' : 'Complete Registration'}
              </button>
              <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium">
                Skip for Now
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? <a href="/login" className="text-green-700 hover:underline font-medium">Log in</a>
          </p>
        )}
      </div>
      </div>
    </div>
  );
}

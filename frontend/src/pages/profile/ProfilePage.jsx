import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import { User, Search, Camera, Lock, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('profile');
  const [whsLookup, setWhsLookup] = useState({ loading: false, result: null });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    handicapIndex: '',
    whsHandicapId: '',
    homeClubId: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/players/me'),
      api.get('/clubs?limit=100'),
    ]).then(([p, c]) => {
      setProfile(p);
      setClubs(c.clubs || []);
      setForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: p.phone || '',
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
        handicapIndex: p.handicapIndex != null ? String(p.handicapIndex) : '',
        whsHandicapId: p.whsHandicapId || '',
        homeClubId: p.homeClubId || '',
      });
    }).catch(() => {
      setError('Failed to load profile');
    }).finally(() => setLoading(false));
  }, []);

  const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none';
  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setSuccess('');
  };

  // WHS Auto-Pull — fetches latest handicap from WHS
  const refreshFromWHS = async () => {
    if (!form.whsHandicapId || form.whsHandicapId.length < 7) return;
    setWhsLookup({ loading: true, result: null });
    try {
      const data = await api.get(`/courses/golfer/${form.whsHandicapId}`);
      setWhsLookup({ loading: false, result: data });
      if (data.available && data.handicapIndex != null) {
        setForm(prev => ({ ...prev, handicapIndex: String(data.handicapIndex) }));
        setSuccess('Handicap updated from WHS');
      }
    } catch {
      setWhsLookup({ loading: false, result: { available: false, message: 'WHS lookup failed' } });
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = {};
      if (form.firstName) data.firstName = form.firstName;
      if (form.lastName) data.lastName = form.lastName;
      data.phone = form.phone || null;
      if (form.dateOfBirth) data.dateOfBirth = form.dateOfBirth;
      if (form.homeClubId) data.homeClubId = form.homeClubId;
      if (form.handicapIndex) data.handicapIndex = form.handicapIndex;
      if (form.whsHandicapId) data.whsHandicapId = form.whsHandicapId;

      const updated = await api.put('/players/me', data);
      setProfile(prev => ({ ...prev, ...updated }));
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const data = await api.upload('/players/me/avatar', formData);
      setProfile(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
      setSuccess('Photo updated');
    } catch (err) {
      setError('Failed to upload photo');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Update your details, handicap, and preferences" icon={User} gradient="green" compact />
      <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Email verification banner */}
      {user && !user.emailVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-amber-800 text-sm font-medium">Please verify your email address</p>
            <p className="text-amber-700 text-xs">Check your inbox for a verification link.</p>
          </div>
          <button
            onClick={async () => {
              try {
                await api.post('/auth/resend-verification');
                setSuccess('Verification email sent');
              } catch {}
            }}
            className="text-amber-700 hover:text-amber-800 text-sm font-medium underline"
          >
            Resend
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === t.id ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-2xl font-bold overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-green-700 text-white rounded-full p-1.5 cursor-pointer hover:bg-green-800 transition">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{form.firstName} {form.lastName}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" required value={form.firstName} onChange={update('firstName')} className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" required value={form.lastName} onChange={update('lastName')} className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+44..." className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} className={input} />
              </div>
            </div>
          </div>

          {/* Golf info */}
          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Golf Details</h3>

            {/* WHS Handicap ID + auto-pull */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WHS Handicap ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.whsHandicapId}
                  onChange={update('whsHandicapId')}
                  placeholder="7-10 digit WHS ID"
                  className={`${input} flex-1`}
                />
                <button
                  type="button"
                  disabled={!form.whsHandicapId || form.whsHandicapId.length < 7 || whsLookup.loading}
                  onClick={refreshFromWHS}
                  className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition flex items-center gap-1"
                >
                  {whsLookup.loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><RefreshCw className="w-3.5 h-3.5" /> Sync WHS</>
                  )}
                </button>
              </div>
              {whsLookup.result && (
                <div className={`mt-2 text-xs px-3 py-2 rounded ${whsLookup.result.available ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {whsLookup.result.available
                    ? `WHS: ${whsLookup.result.firstName} ${whsLookup.result.lastName} — Handicap Index: ${whsLookup.result.handicapIndex}`
                    : (whsLookup.result.message || 'WHS lookup not available — enter handicap manually')}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Your handicap is auto-synced from WHS when linked. Manual override below.
              </p>
            </div>

            {/* Handicap Index — manual override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Handicap Index
                {form.whsHandicapId && (
                  <span className="text-xs text-green-600 ml-2">Auto-synced from WHS</span>
                )}
              </label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="54"
                value={form.handicapIndex}
                onChange={update('handicapIndex')}
                placeholder="e.g. 18.5"
                className={input}
              />
              {form.whsHandicapId && (
                <p className="text-xs text-amber-600 mt-1">
                  Editing manually will override the WHS auto-pull value. Click "Sync WHS" to restore.
                </p>
              )}
            </div>

            {/* Home Club */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Club</label>
              <select value={form.homeClubId} onChange={update('homeClubId')} className={input}>
                <option value="">Select club</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Change Password</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className={input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      )}
      </div>
    </div>
  );
}

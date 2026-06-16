import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Users, Trophy, DollarSign, Megaphone, Calendar, Settings, MapPin, Phone, Mail, Globe, ClipboardList, ChevronRight, Search, Award, TrendingUp, ShoppingBag, Plus, Pencil, Trash2, Tag, X } from 'lucide-react';

export default function ClubPortal() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clubs, setClubs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [settingsForm, setSettingsForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [offerForm, setOfferForm] = useState(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/clubs?limit=100').then(data => {
        setClubs(data.clubs || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (user?.role === 'CLUB_MANAGER') {
      api.get('/clubs/my/managed').then(mgr => {
        if (mgr.club) {
          return api.get(`/clubs/${mgr.club.id}/dashboard`).then(d => {
            setDashboard(d);
            setSettingsForm({
              name: d.club.name || '',
              description: d.club.description || '',
              phone: d.club.phone || '',
              email: d.club.email || '',
              website: d.club.website || '',
              address: d.club.address || '',
              city: d.club.city || '',
              county: d.club.county || '',
              postcode: d.club.postcode || '',
            });
          });
        }
        setError('No club assigned');
      }).catch(err => setError(err.message)).finally(() => setLoading(false));
    } else {
      api.get('/players/me').then(player => {
        if (player.homeClubId) {
          return api.get(`/clubs/${player.homeClubId}/dashboard`).then(d => {
            setDashboard(d);
            setSettingsForm({
              name: d.club.name || '',
              description: d.club.description || '',
              phone: d.club.phone || '',
              email: d.club.email || '',
              website: d.club.website || '',
              address: d.club.address || '',
              city: d.club.city || '',
              county: d.club.county || '',
              postcode: d.club.postcode || '',
            });
          });
        }
        setError('No club assigned');
      }).catch(err => setError(err.message)).finally(() => setLoading(false));
    }
  }, [user]);

  const handleSaveSettings = async () => {
    if (!dashboard || !settingsForm) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put(`/clubs/${dashboard.club.id}/settings`, settingsForm);
      setSaveMsg('Settings saved successfully');
      const d = await api.get(`/clubs/${dashboard.club.id}/dashboard`);
      setDashboard(d);
    } catch (err) {
      setSaveMsg('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const OFFER_TYPES = [
    { value: 'visitor_green_fee', label: 'Visitor Green Fee' },
    { value: 'society_package', label: 'Society Package' },
    { value: 'membership_offer', label: 'Membership Offer' },
    { value: 'lesson_package', label: 'Lesson Package' },
  ];

  const newOfferTemplate = {
    offeringType: 'visitor_green_fee',
    title: '',
    description: '',
    pricePence: '',
    originalPricePence: '',
    validFrom: '',
    validTo: '',
    maxRedemptions: '',
  };

  const handleSaveOffer = async () => {
    if (!offerForm || !dashboard) return;
    setOfferSaving(true);
    setOfferMsg('');
    try {
      const payload = {
        clubId: dashboard.club.id,
        offeringType: offerForm.offeringType,
        title: offerForm.title,
        description: offerForm.description || null,
        pricePence: offerForm.pricePence ? Math.round(Number(offerForm.pricePence) * 100) : null,
        originalPricePence: offerForm.originalPricePence ? Math.round(Number(offerForm.originalPricePence) * 100) : null,
        validFrom: offerForm.validFrom || null,
        validTo: offerForm.validTo || null,
        maxRedemptions: offerForm.maxRedemptions ? Number(offerForm.maxRedemptions) : null,
      };
      if (offerForm.id) {
        await api.put(`/marketplace/${offerForm.id}`, payload);
      } else {
        await api.post('/marketplace', payload);
      }
      const d = await api.get(`/clubs/${dashboard.club.id}/dashboard`);
      setDashboard(d);
      setOfferForm(null);
      setOfferMsg(offerForm.id ? 'Offer updated' : 'Offer created');
    } catch (err) {
      setOfferMsg('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setOfferSaving(false);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await api.delete(`/marketplace/${offerId}`);
      const d = await api.get(`/clubs/${dashboard.club.id}/dashboard`);
      setDashboard(d);
      setOfferMsg('Offer deleted');
    } catch (err) {
      setOfferMsg('Failed to delete: ' + err.message);
    }
  };

  const handleToggleOffer = async (offer) => {
    try {
      await api.put(`/marketplace/${offer.id}`, { isActive: !offer.isActive });
      const d = await api.get(`/clubs/${dashboard.club.id}/dashboard`);
      setDashboard(d);
    } catch (err) {
      setOfferMsg('Failed to update: ' + err.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  // Admin: show all clubs
  if (user?.role === 'ADMIN' && clubs.length > 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Building2 className="w-7 h-7 text-green-700" /> Club Management</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map(club => (
            <Link key={club.id} to={`/clubs/${club.slug}`} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{club.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{club.region?.name || 'No region'}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {club._count?.players || 0} members</span>
              </div>
              <span className={`mt-3 inline-block px-2 py-0.5 rounded text-xs font-medium ${club.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                {club.isActive ? 'Active' : 'Inactive'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No Club Dashboard Available</h2>
        <p className="text-gray-500 mt-2">{error || 'You are not assigned as a manager of any club.'}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'championship', label: 'Championship', icon: Award },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'offers', label: 'Offers', icon: ShoppingBag },
    { id: 'sponsors', label: 'Sponsors', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredMembers = (dashboard.members || []).filter(m => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    return `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900" />
        <div className="relative max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><Building2 className="w-7 h-7" /> {dashboard.club.name}</h1>
              <p className="text-green-200 mt-1">{dashboard.club.region?.name || ''} &bull; Club Portal</p>
            </div>
            <Link to={`/clubs/${dashboard.club.slug}`} className="bg-white/15 hover:bg-white/25 backdrop-blur text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              View Public Page <ChevronRight className="w-4 h-4 inline" />
            </Link>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Members" value={dashboard.stats.members} />
        <StatCard icon={Trophy} label="Entries" value={dashboard.stats.entries} />
        <StatCard icon={ClipboardList} label="Matches" value={dashboard.stats.matches} />
        <StatCard icon={DollarSign} label="Revenue" value={`£${(dashboard.stats.revenue / 100).toFixed(0)}`} />
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-gray-700 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === t.id ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Club Info */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 text-gray-900 dark:text-white">Club Information</h2>
            {dashboard.club.description && <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{dashboard.club.description}</p>}
            <div className="space-y-2 text-sm">
              {dashboard.club.address && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MapPin className="w-4 h-4 text-gray-400" /> {dashboard.club.address}{dashboard.club.postcode ? `, ${dashboard.club.postcode}` : ''}</p>}
              {dashboard.club.phone && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Phone className="w-4 h-4 text-gray-400" /> {dashboard.club.phone}</p>}
              {dashboard.club.email && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Mail className="w-4 h-4 text-gray-400" /> {dashboard.club.email}</p>}
              {dashboard.club.website && <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Globe className="w-4 h-4 text-gray-400" /> <a href={dashboard.club.website} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">{dashboard.club.website}</a></p>}
            </div>
            {dashboard.club.slopeRating && (
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Slope</p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{dashboard.club.slopeRating}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Course Rating</p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{dashboard.club.courseRating ? Number(dashboard.club.courseRating).toFixed(1) : '-'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Par</p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{dashboard.club.par || '-'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-green-700" /> Upcoming Fixtures</h2>
              {(dashboard.fixtures || []).length > 0 ? (
                <div className="space-y-2">
                  {dashboard.fixtures.slice(0, 5).map(f => (
                    <div key={f.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div>
                        <p className="font-medium">{f.playerA?.firstName} {f.playerA?.lastName} vs {f.playerB?.firstName || 'TBD'} {f.playerB?.lastName || ''}</p>
                        <p className="text-xs text-gray-500">{f.tournament?.name}</p>
                      </div>
                      {f.scheduledDate && <span className="text-xs text-gray-400">{new Date(f.scheduledDate).toLocaleDateString('en-GB')}</span>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500 text-sm">No upcoming fixtures</p>}
            </div>

            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-green-700" /> Recent Results</h2>
              {(dashboard.results || []).length > 0 ? (
                <div className="space-y-2">
                  {dashboard.results.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div>
                        <p className="font-medium">{r.winner?.firstName} {r.winner?.lastName} <span className="text-green-600">won</span></p>
                        <p className="text-xs text-gray-500">{r.playerA?.firstName} {r.playerA?.lastName} vs {r.playerB?.firstName} {r.playerB?.lastName}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{r.result?.resultText}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500 text-sm">No results yet</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'championship' && (
        <div className="space-y-6">
          {/* Club Championship Position */}
          {(dashboard.regionChampionship || []).length > 0 && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" /> Club Championship Standings
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                How your club ranks against others in the region. Clubs earn points from their players' league performances.
              </p>
              <table className="w-full text-sm text-gray-900 dark:text-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400">Club</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">Players</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">Matches</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">Wins</th>
                    <th className="px-3 py-2 text-center font-semibold text-amber-700 bg-amber-50">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.regionChampionship.map((c, i) => {
                    const isOurClub = c.clubId === dashboard.club.id;
                    return (
                      <tr key={c.id} className={`${isOurClub ? 'bg-green-50 font-medium' : ''} hover:bg-gray-50`}>
                        <td className="px-3 py-3 font-bold text-gray-700 dark:text-gray-300">{c.position || i + 1}</td>
                        <td className="px-3 py-3">
                          <span className={isOurClub ? 'text-green-700 font-semibold' : 'text-gray-900'}>
                            {c.club?.name} {isOurClub && '(You)'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{c.playerCount}</td>
                        <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{c.matchesPlayed}</td>
                        <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{c.matchesWon}</td>
                        <td className="px-3 py-3 text-center font-bold text-amber-700 bg-amber-50">{c.totalPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Individual Player League Standings */}
          {(dashboard.leagueStandings || []).length > 0 ? (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-700" /> Your Players' League Standings
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Individual performance of your club's players across all active leagues.
              </p>
              <table className="w-full text-sm text-gray-900 dark:text-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400">Pos</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400">Player</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400">League</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">P</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">W</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">D</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">L</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">Bonus</th>
                    <th className="px-3 py-2 text-center font-semibold text-emerald-700 bg-emerald-50">Pts</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.leagueStandings
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-3">
                        <span className={`font-bold ${s.position <= 4 ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {s.position || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{s.player?.firstName} {s.player?.lastName}</div>
                        <div className="text-xs text-gray-500">HI: {Number(s.player?.handicapIndex || 0).toFixed(1)}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{s.tournament?.name}</td>
                      <td className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">{s.played}</td>
                      <td className="px-3 py-3 text-center font-medium text-gray-900 dark:text-white">{s.wins}</td>
                      <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{s.draws}</td>
                      <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{s.losses}</td>
                      <td className="px-3 py-3 text-center text-amber-600 font-medium">{s.bonusPoints || 0}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50">{s.totalPoints}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-medium ${s.holesDifferential > 0 ? 'text-emerald-600' : s.holesDifferential < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          {s.holesDifferential > 0 ? '+' : ''}{s.holesDifferential}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 text-center py-12">
              <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No league data yet</p>
              <p className="text-sm text-gray-400 mt-1">Player standings will appear here once league matches are played</p>
            </div>
          )}

          {/* Club Championship Summary Card */}
          {(dashboard.clubChampionship || []).length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" /> Season Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dashboard.clubChampionship.map(cp => (
                  <div key={cp.id} className="text-center">
                    <p className="text-xs text-amber-700 font-medium">{cp.season} Season</p>
                    <p className="text-3xl font-bold text-amber-900">{cp.totalPoints}</p>
                    <p className="text-xs text-amber-600">points</p>
                    <div className="mt-2 text-xs text-amber-700 space-y-0.5">
                      <p>{cp.playerCount} players • {cp.matchesWon}/{cp.matchesPlayed} wins</p>
                      {cp.position && <p className="font-semibold">Position: #{cp.position}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Members ({filteredMembers.length})</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
          </div>
          <table className="w-full text-sm text-gray-900 dark:text-gray-200">
            <thead>
              <tr className="border-b dark:border-gray-600 text-left text-gray-500 dark:text-gray-400">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Handicap</th>
                <th className="pb-3 font-medium">Ranking Points</th>
                <th className="pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(m => (
                <tr key={m.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700/50">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">{m.firstName} {m.lastName}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{m.user?.email || '-'}</td>
                  <td className="py-3">{m.handicapIndex ? Number(m.handicapIndex).toFixed(1) : '-'}</td>
                  <td className="py-3"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-medium">{m.rankingPoints}</span></td>
                  <td className="py-3 text-gray-400">{new Date(m.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-gray-500">No members found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'fixtures' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 text-gray-900 dark:text-white">Upcoming Fixtures</h2>
          {(dashboard.fixtures || []).length > 0 ? (
            <table className="w-full text-sm text-gray-900 dark:text-gray-200">
              <thead>
                <tr className="border-b dark:border-gray-600 text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium">Tournament</th>
                  <th className="pb-3 font-medium">Player A</th>
                  <th className="pb-3 font-medium">Player B</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.fixtures.map(f => (
                  <tr key={f.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700/50">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">{f.tournament?.name}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{f.playerA?.firstName} {f.playerA?.lastName} {f.playerA?.handicapIndex ? `(${Number(f.playerA.handicapIndex).toFixed(1)})` : ''}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{f.playerB ? `${f.playerB.firstName} ${f.playerB.lastName} ${f.playerB.handicapIndex ? `(${Number(f.playerB.handicapIndex).toFixed(1)})` : ''}` : 'TBD'}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{f.scheduledDate ? new Date(f.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        f.status === 'SCHEDULED' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-gray-500 text-sm py-8 text-center">No upcoming fixtures</p>}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 text-gray-900 dark:text-white">Match Results</h2>
          {(dashboard.results || []).length > 0 ? (
            <table className="w-full text-sm text-gray-900 dark:text-gray-200">
              <thead>
                <tr className="border-b dark:border-gray-600 text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-3 font-medium">Tournament</th>
                  <th className="pb-3 font-medium">Player A</th>
                  <th className="pb-3 font-medium">Player B</th>
                  <th className="pb-3 font-medium">Winner</th>
                  <th className="pb-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.results.map(r => (
                  <tr key={r.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700/50">
                    <td className="py-3 font-medium text-gray-900 dark:text-white">{r.tournament?.name}</td>
                    <td className="py-3">{r.playerA?.firstName} {r.playerA?.lastName}</td>
                    <td className="py-3">{r.playerB?.firstName} {r.playerB?.lastName}</td>
                    <td className="py-3 text-green-700 font-medium">{r.winner?.firstName} {r.winner?.lastName}</td>
                    <td className="py-3"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-medium">{r.result?.resultText}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-gray-500 text-sm py-8 text-center">No results yet</p>}
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Marketplace Offers</h2>
            <button onClick={() => setOfferForm({ ...newOfferTemplate })}
              className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Offer
            </button>
          </div>

          {offerMsg && (
            <div className={`mb-4 px-4 py-2 rounded text-sm ${offerMsg.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {offerMsg}
            </div>
          )}

          {offerForm && (
            <div className="mb-6 border rounded-xl p-5 bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">{offerForm.id ? 'Edit Offer' : 'New Offer'}</h3>
                <button onClick={() => setOfferForm(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Type</label>
                  <select value={offerForm.offeringType} onChange={e => setOfferForm({ ...offerForm, offeringType: e.target.value })}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500">
                    {OFFER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                    placeholder="e.g. Summer Visitor Green Fee" className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows="3" value={offerForm.description} onChange={e => setOfferForm({ ...offerForm, description: e.target.value })}
                    placeholder="Describe what's included in this offer..." className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (&pound;)</label>
                  <input type="number" step="0.01" min="0" value={offerForm.pricePence} onChange={e => setOfferForm({ ...offerForm, pricePence: e.target.value })}
                    placeholder="25.00" className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (&pound;) <span className="text-gray-400">(for discount display)</span></label>
                  <input type="number" step="0.01" min="0" value={offerForm.originalPricePence} onChange={e => setOfferForm({ ...offerForm, originalPricePence: e.target.value })}
                    placeholder="40.00" className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input type="date" value={offerForm.validFrom} onChange={e => setOfferForm({ ...offerForm, validFrom: e.target.value })}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input type="date" value={offerForm.validTo} onChange={e => setOfferForm({ ...offerForm, validTo: e.target.value })}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Redemptions <span className="text-gray-400">(leave blank for unlimited)</span></label>
                  <input type="number" min="1" value={offerForm.maxRedemptions} onChange={e => setOfferForm({ ...offerForm, maxRedemptions: e.target.value })}
                    placeholder="100" className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={handleSaveOffer} disabled={offerSaving || !offerForm.title}
                  className="bg-green-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-800 transition disabled:opacity-50">
                  {offerSaving ? 'Saving...' : offerForm.id ? 'Update Offer' : 'Create Offer'}
                </button>
                <button onClick={() => setOfferForm(null)}
                  className="px-6 py-2 rounded-lg font-medium border text-gray-600 hover:bg-gray-50 dark:bg-gray-900 transition">Cancel</button>
              </div>
            </div>
          )}

          {(dashboard.offerings || []).length > 0 ? (
            <div className="space-y-3">
              {dashboard.offerings.map(o => (
                <div key={o.id} className={`border rounded-xl p-5 ${o.isActive ? 'bg-white' : 'bg-gray-50 dark:bg-gray-900 opacity-70'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded capitalize">
                          {o.offeringType.replace(/_/g, ' ')}
                        </span>
                        {!o.isActive && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactive</span>}
                        {o.originalPricePence > o.pricePence && o.pricePence && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {Math.round((1 - o.pricePence / o.originalPricePence) * 100)}% off
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{o.title}</h3>
                      {o.description && <p className="text-sm text-gray-600 mt-1">{o.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {o.pricePence != null && (
                          <span className="font-semibold text-green-700 text-lg">&pound;{(o.pricePence / 100).toFixed(2)}
                            {o.originalPricePence > o.pricePence && (
                              <span className="text-gray-400 line-through text-sm ml-2">&pound;{(o.originalPricePence / 100).toFixed(2)}</span>
                            )}
                          </span>
                        )}
                        {o.validTo && <span>Valid until {new Date(o.validTo).toLocaleDateString('en-GB')}</span>}
                        {o.maxRedemptions && <span>Max {o.maxRedemptions} redemptions ({o.redemptionCount || 0} used)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => handleToggleOffer(o)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${o.isActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'}`}>
                        {o.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setOfferForm({
                        id: o.id,
                        offeringType: o.offeringType,
                        title: o.title,
                        description: o.description || '',
                        pricePence: o.pricePence ? (o.pricePence / 100).toFixed(2) : '',
                        originalPricePence: o.originalPricePence ? (o.originalPricePence / 100).toFixed(2) : '',
                        validFrom: o.validFrom ? o.validFrom.slice(0, 10) : '',
                        validTo: o.validTo ? o.validTo.slice(0, 10) : '',
                        maxRedemptions: o.maxRedemptions || '',
                      })}
                        className="p-2 text-gray-400 hover:text-blue-600 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteOffer(o.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !offerForm && (
            <div className="text-center py-8">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No offers yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first marketplace offer to attract visitors and new members.</p>
              <button onClick={() => setOfferForm({ ...newOfferTemplate })}
                className="mt-4 bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Your First Offer
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sponsors' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 text-gray-900 dark:text-white">Club Sponsors</h2>
          {(dashboard.sponsors || []).length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {dashboard.sponsors.map(s => (
                <div key={s.id} className="border dark:border-gray-700 rounded-xl p-5 flex items-start gap-4">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} className="w-16 h-16 rounded-lg object-contain bg-gray-50 dark:bg-gray-900 p-2" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Megaphone className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded capitalize">{s.tier?.toLowerCase()} sponsor</span>
                    {s.description && <p className="text-sm text-gray-600 mt-2">{s.description}</p>}
                    {s.websiteUrl && <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="text-green-600 text-sm hover:underline mt-1 block">Visit website →</a>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No sponsors yet</p>
              <p className="text-sm text-gray-400 mt-1">Sponsors can be added from the admin panel</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && settingsForm && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 text-gray-900 dark:text-white">Club Settings</h2>
          {saveMsg && (
            <div className={`mb-4 px-4 py-2 rounded text-sm ${saveMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {saveMsg}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
              <input type="text" value={settingsForm.name} onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={settingsForm.email} onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={settingsForm.phone} onChange={e => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={settingsForm.website} onChange={e => setSettingsForm({ ...settingsForm, website: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={settingsForm.address} onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={settingsForm.city} onChange={e => setSettingsForm({ ...settingsForm, city: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input type="text" value={settingsForm.county} onChange={e => setSettingsForm({ ...settingsForm, county: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
              <input type="text" value={settingsForm.postcode} onChange={e => setSettingsForm({ ...settingsForm, postcode: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows="4" value={settingsForm.description} onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={handleSaveSettings} disabled={saving}
              className="bg-green-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-800 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5 text-center">
      <Icon className="w-6 h-6 text-green-700 mx-auto mb-2" />
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

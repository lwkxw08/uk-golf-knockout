import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Users, Clock, AlertTriangle, Settings, RefreshCw, ChevronLeft, ChevronRight, Search, XCircle, Plus } from 'lucide-react';

export default function MembershipTrackingPage() {
  const [stats, setStats] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expiring, setExpiring] = useState('');
  const [settings, setSettings] = useState({ durationMonths: 12, amountPence: 3900 });
  const [showSettings, setShowSettings] = useState(false);
  const [durationInput, setDurationInput] = useState(12);
  const [msg, setMsg] = useState('');
  const [extending, setExtending] = useState(null);
  const [extendMonths, setExtendMonths] = useState(12);

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  useEffect(() => {
    loadMemberships();
  }, [page, filter, search, expiring]);

  const loadStats = async () => {
    try { setStats(await api.get('/memberships/admin/stats')); } catch {}
  };

  const loadSettings = async () => {
    try {
      const s = await api.get('/memberships/admin/settings');
      setSettings(s);
      setDurationInput(s.durationMonths);
    } catch {}
  };

  const loadMemberships = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter) params.set('status', filter);
      if (search) params.set('search', search);
      if (expiring) params.set('expiring', expiring);
      const data = await api.get(`/memberships/admin/all?${params}`);
      setMemberships(data.memberships);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {}
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/memberships/admin/settings', { durationMonths: parseInt(durationInput) });
      setMsg('Duration updated to ' + durationInput + ' months');
      loadSettings();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to update'); }
  };

  const handleExtend = async (id) => {
    try {
      await api.post(`/memberships/admin/${id}/extend`, { months: extendMonths });
      setExtending(null);
      setMsg('Membership extended');
      loadMemberships();
      loadStats();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to extend'); }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this membership? The player will lose premium access immediately.')) return;
    try {
      await api.post(`/memberships/admin/${id}/revoke`);
      setMsg('Membership revoked');
      loadMemberships();
      loadStats();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to revoke'); }
  };

  const handleSendReminders = async () => {
    try {
      await api.post('/memberships/admin/send-reminders');
      setMsg('Reminder check triggered');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed'); }
  };

  const statusBadge = (status) => {
    const map = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      PAST_DUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  const daysUntil = (date) => {
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Membership Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor player memberships, expiries, and renewals</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSendReminders} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" /> Send Reminders
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-1 text-sm bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {msg && <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Failed') ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>{msg}</div>}

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Membership Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Membership Duration</label>
              <div className="flex gap-2">
                <select value={durationInput} onChange={(e) => setDurationInput(e.target.value)} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="1">1 month</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </select>
                <button onClick={handleSaveSettings} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800">Save</button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">New memberships will last {durationInput} months from sign-up date</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Fee</label>
              <p className="text-lg font-bold text-gray-900 dark:text-white">£{(settings.amountPence / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Set via Admin → Pricing → player_membership_annual</p>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300"><strong>Email reminders:</strong> Sent automatically at 30 days, 7 days before expiry, and on expiry day. Use "Send Reminders" to trigger a manual check.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
            <Users className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expiringIn30}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Expiring (30d)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
            <Clock className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expiringIn7}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Expiring (7d)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
            <XCircle className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expired}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Expired</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">£{(stats.totalRevenue / 100).toFixed(0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
            />
          </div>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select value={expiring} onChange={(e) => { setExpiring(e.target.value); setPage(1); }} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
            <option value="">All Expiry</option>
            <option value="7">Expiring in 7 days</option>
            <option value="30">Expiring in 30 days</option>
            <option value="60">Expiring in 60 days</option>
            <option value="90">Expiring in 90 days</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Player</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Start</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Days Left</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {memberships.map((m) => {
                const days = daysUntil(m.currentPeriodEnd);
                return (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {m.player.firstName} {m.player.lastName}
                      {m.player.handicapIndex && <span className="ml-2 text-xs text-gray-500">({m.player.handicapIndex})</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.player.user?.email}</td>
                    <td className="px-4 py-3">{statusBadge(m.status)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(m.currentPeriodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(m.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      {m.status === 'ACTIVE' ? (
                        <span className={`font-medium ${days <= 7 ? 'text-red-600 dark:text-red-400' : days <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                          {days} days
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {extending === m.id ? (
                          <div className="flex items-center gap-1">
                            <select value={extendMonths} onChange={(e) => setExtendMonths(parseInt(e.target.value))} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-1 py-0.5 text-xs">
                              <option value="1">+1m</option>
                              <option value="3">+3m</option>
                              <option value="6">+6m</option>
                              <option value="12">+12m</option>
                            </select>
                            <button onClick={() => handleExtend(m.id)} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Go</button>
                            <button onClick={() => setExtending(null)} className="text-xs text-gray-500">✕</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setExtending(m.id)} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded hover:bg-blue-200">
                              <Plus className="w-3 h-3 inline" /> Extend
                            </button>
                            {m.status === 'ACTIVE' && (
                              <button onClick={() => handleRevoke(m.id)} className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded hover:bg-red-200">
                                Revoke
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {memberships.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No memberships found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded border dark:border-gray-600 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded border dark:border-gray-600 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

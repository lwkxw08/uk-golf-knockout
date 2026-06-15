import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { BarChart3, Users, Trophy, MapPin, Banknote, Activity, AlertTriangle, Calendar, TrendingUp, Shield, Clock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/tournaments?limit=10'),
    ]).then(([s, t]) => {
      setStats(s);
      setTournaments(t.tournaments || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const statCards = [
    { icon: MapPin, label: 'Clubs', value: stats?.clubs || 0, color: 'bg-blue-100 text-blue-700', link: '/admin/clubs' },
    { icon: Users, label: 'Players', value: stats?.players || 0, color: 'bg-green-100 text-green-700' },
    { icon: Trophy, label: 'Tournaments', value: stats?.tournaments || 0, color: 'bg-purple-100 text-purple-700' },
    { icon: Activity, label: 'Active Matches', value: stats?.activeMatches || 0, color: 'bg-orange-100 text-orange-700' },
    { icon: BarChart3, label: 'Completed Matches', value: stats?.completedMatches || 0, color: 'bg-teal-100 text-teal-700' },
    { icon: Banknote, label: 'Platform Revenue', value: `£${((stats?.revenue?.platform || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, color: 'bg-emerald-100 text-emerald-700' },
    { icon: Shield, label: 'Active Memberships', value: stats?.activeMemberships || 0, color: 'bg-indigo-100 text-indigo-700' },
    { icon: TrendingUp, label: 'Total Entries', value: stats?.totalEntries || 0, color: 'bg-pink-100 text-pink-700' },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform overview and management"
        icon={Shield}
        gradient="gray"
        compact
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/tournaments/new" className="bg-white text-green-800 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-semibold transition">New Tournament</Link>
            <Link to="/admin/clubs" className="bg-white/15 text-white hover:bg-white/25 px-4 py-2 rounded-lg text-sm font-medium transition">Clubs</Link>
            <Link to="/admin/sponsors" className="bg-white/15 text-white hover:bg-white/25 px-4 py-2 rounded-lg text-sm font-medium transition">Sponsors</Link>
            <Link to="/admin/pricing" className="bg-white/15 text-white hover:bg-white/25 px-4 py-2 rounded-lg text-sm font-medium transition">Pricing</Link>
            <Link to="/club-portal" className="bg-white/15 text-white hover:bg-white/25 px-4 py-2 rounded-lg text-sm font-medium transition">Club Portal</Link>
          </div>
        }
      />
      <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Disputes alert */}
      {(stats?.disputes || 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <span className="font-semibold text-red-800">{stats.disputes} disputed match{stats.disputes !== 1 ? 'es' : ''}</span>
            <span className="text-red-700 ml-2">require admin resolution</span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ icon: Icon, label, value, color, link }) => {
          const Card = (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg transition">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          );
          return link ? <Link key={label} to={link}>{Card}</Link> : <div key={label}>{Card}</div>;
        })}
      </div>

      {/* Revenue breakdown */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">£{((stats?.revenue?.total || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Platform Share</h3>
          <p className="text-2xl font-bold text-emerald-700">£{((stats?.revenue?.platform || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Club Share</h3>
          <p className="text-2xl font-bold text-blue-700">£{((stats?.revenue?.clubs || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Region breakdown */}
        {stats?.regionBreakdown?.length > 0 && (
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Clubs by Region</h2>
            <div className="space-y-3">
              {stats.regionBreakdown.map((r, i) => (
                <div key={r.county || `unknown-${i}`} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{r.county || 'Not specified'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div className="bg-green-600 rounded-full h-2" style={{ width: `${Math.min(100, (r._count / (stats.clubs || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">{r._count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tournament status breakdown */}
        {stats?.tournamentsByStatus && Object.keys(stats.tournamentsByStatus).length > 0 && (
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tournament Status</h2>
            <div className="space-y-3">
              {Object.entries(stats.tournamentsByStatus).map(([status, count]) => {
                const colors = {
                  DRAFT: 'bg-gray-200 text-gray-700',
                  REGISTRATION_OPEN: 'bg-blue-100 text-blue-700',
                  IN_PROGRESS: 'bg-green-100 text-green-700',
                  COMPLETED: 'bg-purple-100 text-purple-700',
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-lg font-bold text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Recent players */}
        {stats?.recentPlayers?.length > 0 && (
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" /> Recent Registrations
            </h2>
            <div className="space-y-3">
              {stats.recentPlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{p.homeClub?.name || 'No club'}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent match results */}
        {stats?.recentMatches?.length > 0 && (
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" /> Recent Results
            </h2>
            <div className="space-y-3">
              {stats.recentMatches.map(m => (
                <div key={m.id} className="border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 text-sm">
                      {m.playerA?.firstName} {m.playerA?.lastName} vs {m.playerB?.firstName} {m.playerB?.lastName}
                    </p>
                    {m.gameWeek && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Week {m.gameWeek}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500">{m.tournament?.name} {m.result?.resultText ? `— ${m.result.resultText}` : ''}</p>
                    <span className="text-xs text-gray-400">{new Date(m.updatedAt).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tournaments table */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Tournaments</h2>
          <Link to="/admin/tournaments/new" className="text-green-700 hover:underline text-sm">Create New</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Format</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Entries</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">
                    <Link to={`/tournaments/${t.id}`} className="text-green-700 hover:underline">{t.name}</Link>
                  </td>
                  <td className="py-3 text-gray-600">{t.formatType.replace(/_/g, ' ')}</td>
                  <td className="py-3">{t.ageCategory}</td>
                  <td className="py-3">{t._count?.entries || 0}</td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{t.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-3">
                    <Link to={`/admin/tournaments/${t.id}`} className="text-green-700 hover:underline text-sm">Manage</Link>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">No tournaments created yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match stats summary */}
      <div className="mt-6 bg-white border rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Match Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats?.totalMatches || 0}</p>
            <p className="text-sm text-gray-500">Total Matches</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-700">{stats?.completedMatches || 0}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{stats?.activeMatches || 0}</p>
            <p className="text-sm text-gray-500">Active / Pending</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{stats?.disputes || 0}</p>
            <p className="text-sm text-gray-500">Disputed</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

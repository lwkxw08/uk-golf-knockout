import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { BarChart3, Users, Trophy, MapPin, Banknote } from 'lucide-react';

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
      setTournaments(t.tournaments);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const statCards = [
    { icon: MapPin, label: 'Clubs', value: stats?.clubs || 0, color: 'bg-blue-100 text-blue-700' },
    { icon: Users, label: 'Players', value: stats?.players || 0, color: 'bg-green-100 text-green-700' },
    { icon: Trophy, label: 'Tournaments', value: stats?.tournaments || 0, color: 'bg-purple-100 text-purple-700' },
    { icon: BarChart3, label: 'Active Matches', value: stats?.activeMatches || 0, color: 'bg-orange-100 text-orange-700' },
    { icon: Banknote, label: 'Platform Revenue', value: `£${((stats?.revenue?.platform || 0) / 100).toFixed(2)}`, color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/admin/tournaments/new" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            New Tournament
          </Link>
          <Link to="/admin/pricing" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
            Pricing
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent tournaments */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Tournaments</h2>
          <Link to="/admin/tournaments" className="text-green-700 hover:underline text-sm">View All</Link>
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
                  <td className="py-3 font-medium">{t.name}</td>
                  <td className="py-3 text-gray-600">{t.formatType.replace(/_/g, ' ')}</td>
                  <td className="py-3">{t.ageCategory}</td>
                  <td className="py-3">{t._count.entries}</td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{t.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-3">
                    <Link to={`/admin/tournaments/${t.id}`} className="text-green-700 hover:underline text-sm">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

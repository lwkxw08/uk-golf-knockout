import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Users, Trophy, DollarSign, Megaphone } from 'lucide-react';

export default function ClubPortal() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    // If admin, show all clubs; if manager, show assigned club
    if (user?.role === 'ADMIN') {
      api.get('/clubs?limit=100').then(data => {
        setClubs(data.clubs || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      // Try to find user's managed club
      api.get('/players/me').then(player => {
        if (player.homeClubId) {
          return api.get(`/clubs/${player.homeClubId}/dashboard`).then(setDashboard);
        }
        setError('No club assigned');
      }).catch(err => setError(err.message)).finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  // Admin: show all clubs
  if (user?.role === 'ADMIN' && clubs.length > 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Building2 className="w-7 h-7 text-green-700" /> Club Management</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map(club => (
            <Link key={club.id} to={`/clubs/${club.slug}`} className="bg-white border rounded-xl p-6 hover:shadow-md transition">
              <h3 className="font-bold text-lg">{club.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{club.region?.name || 'No region'}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {club._count?.players || 0} members</span>
              </div>
              <span className={`mt-3 inline-block px-2 py-0.5 rounded text-xs font-medium ${club.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
        <h2 className="text-xl font-semibold text-gray-700">No Club Dashboard Available</h2>
        <p className="text-gray-500 mt-2">{error || 'You are not assigned as a manager of any club.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl p-8 mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Building2 className="w-7 h-7" /> {dashboard.club.name}</h1>
        <p className="text-green-200 mt-1">{dashboard.club.region?.name || ''} &bull; Club Portal</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Members" value={dashboard.stats.members} />
        <StatCard icon={Trophy} label="Entries" value={dashboard.stats.entries} />
        <StatCard icon={Trophy} label="Matches" value={dashboard.stats.matches} />
        <StatCard icon={DollarSign} label="Revenue" value={`£${(dashboard.stats.revenue / 100).toFixed(0)}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-green-700" /> Sponsors</h2>
          {dashboard.sponsors.length > 0 ? (
            <div className="space-y-2">
              {dashboard.sponsors.map(s => (
                <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{s.tier}</p>
                  </div>
                  {s.websiteUrl && <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="text-green-600 text-sm hover:underline">Visit</a>}
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No sponsors yet</p>}
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to={`/clubs/${dashboard.club.slug}`} className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition font-medium text-sm">
              View Public Club Page &rarr;
            </Link>
            <Link to="/marketplace" className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition font-medium text-sm">
              Manage Course Offerings &rarr;
            </Link>
            <Link to="/subscriptions" className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition font-medium text-sm">
              Manage Subscription &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border rounded-xl p-5 text-center">
      <Icon className="w-6 h-6 text-green-700 mx-auto mb-2" />
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Trophy, Users, Calendar } from 'lucide-react';

const FORMAT_LABELS = {
  SINGLES_MATCHPLAY: 'Singles Matchplay',
  SINGLES_STROKEPLAY: 'Singles Strokeplay',
  SINGLES_STABLEFORD: 'Singles Stableford',
  PAIRS_MATCHPLAY: 'Pairs Matchplay',
  PAIRS_BESTBALL: 'Pairs Best Ball',
  PAIRS_FOURSOMES: 'Pairs Foursomes',
  PAIRS_GREENSOMES: 'Pairs Greensomes',
  TEAM_MATCHPLAY: 'Team Matchplay',
  TEAM_STROKEPLAY: 'Team Strokeplay',
  TEAM_STABLEFORD: 'Team Stableford',
};

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REGISTRATION_OPEN: 'bg-green-100 text-green-700',
  REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-700',
  DRAW_PENDING: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
};

export default function TournamentsPage() {
  const [data, setData] = useState({ tournaments: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? `?ageCategory=${filter}` : '';
    api.get(`/tournaments${params}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
        <div className="flex gap-2">
          {['', 'OPEN', 'JUNIOR', 'SENIOR'].map((val) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === val ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {val || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading tournaments...</div>
      ) : data.tournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tournaments found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.tournaments.map((t) => {
            const isLeague = t.leagueMatchCount > 0;
            const linkTo = isLeague ? `/league/${t.id}` : `/tournaments/${t.id}`;
            return (
            <Link key={t.id} to={linkTo}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-6 block">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-gray-900">{t.name}</h3>
                <div className="flex gap-1">
                  {isLeague && <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">League</span>}
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[t.status] || ''}`}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <p className="text-sm text-green-700 font-medium mb-3">
                {isLeague ? 'Regional League — Matchplay' : (FORMAT_LABELS[t.formatType] || t.formatType)}
              </p>

              {t.ageCategory !== 'OPEN' && (
                <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mb-3">
                  {t.ageCategory}
                </span>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {t._count.entries} entries
                </span>
                {t.pricing[0] && (
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    &pound;{(t.pricing[0].amountPence / 100).toFixed(2)}
                  </span>
                )}
              </div>

              {t.registrationDeadline && (
                <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  Deadline: {new Date(t.registrationDeadline).toLocaleDateString('en-GB')}
                </div>
              )}
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

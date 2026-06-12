import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Trophy, Users, Calendar, Search, Navigation } from 'lucide-react';

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

const RADIUS_OPTIONS = [
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 100, label: '100 miles' },
];

export default function TournamentsPage() {
  const [data, setData] = useState({ tournaments: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radius, setRadius] = useState(25);
  const [postcodeError, setPostcodeError] = useState('');
  const [activePostcode, setActivePostcode] = useState('');

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setPostcodeError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('ageCategory', filter);
      if (searchText.trim()) params.set('search', searchText.trim());
      if (activePostcode) {
        params.set('postcode', activePostcode);
        params.set('radius', radius);
      }
      const qs = params.toString();
      const result = await api.get(`/tournaments${qs ? `?${qs}` : ''}`);
      setData(result);
    } catch (err) {
      if (err.message?.includes('Invalid postcode')) {
        setPostcodeError('Invalid postcode — please check and try again');
        setData({ tournaments: [], total: 0 });
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, searchText, activePostcode, radius]);

  useEffect(() => { loadTournaments(); }, [filter, activePostcode, radius]);

  // Debounce text search
  useEffect(() => {
    const timer = setTimeout(() => loadTournaments(), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handlePostcodeSearch = (e) => {
    e.preventDefault();
    setActivePostcode(postcode.trim());
  };

  const clearPostcode = () => {
    setPostcode('');
    setActivePostcode('');
    setPostcodeError('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
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

      {/* Search bar */}
      <div className="bg-white border rounded-xl p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Free text search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search tournaments by name or description..."
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Postcode search */}
          <form onSubmit={handlePostcodeSearch} className="flex gap-2 items-center">
            <div className="relative">
              <Navigation className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="Postcode (e.g. HP9 2SE)"
                className="border rounded-lg pl-9 pr-3 py-2 text-sm w-44 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="border rounded-lg px-2 py-2 text-sm">
              {RADIUS_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Search
            </button>
            {activePostcode && (
              <button type="button" onClick={clearPostcode} className="text-sm text-gray-500 hover:text-red-600 transition">
                Clear
              </button>
            )}
          </form>
        </div>

        {activePostcode && !postcodeError && (
          <p className="text-xs text-green-700">Showing tournaments with participating clubs within {radius} miles of {activePostcode}</p>
        )}
        {postcodeError && <p className="text-xs text-red-600">{postcodeError}</p>}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : data.tournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No tournaments found</p>
          {(searchText || activePostcode) && (
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or expanding the radius.</p>
          )}
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

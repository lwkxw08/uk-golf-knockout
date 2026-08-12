import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Trophy, Users, Calendar, Search, Navigation, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

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
  REGISTRATION_OPEN: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  REGISTRATION_CLOSED: 'bg-yellow-100 text-yellow-700',
  DRAW_PENDING: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  IN_PROGRESS: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
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
    <div>
      <PageHeader
        title="Tournaments"
        subtitle="Find and enter competitions across the UK"
        icon={Trophy}
        gradient="green"
        actions={
          <div className="flex gap-2">
            {['', 'OPEN', 'JUNIOR', 'SENIOR'].map((val) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === val ? 'bg-white text-green-800' : 'bg-white/15 text-white hover:bg-white/25'
                }`}>
                {val || 'All'}
              </button>
            ))}
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-4 mb-6 space-y-3 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {/* Free text search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search tournaments by name or description..."
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
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
                className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm w-44 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="border dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-2 text-sm">
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
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
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
          {data.tournaments.map((t, i) => {
            const isLeague = t.leagueMatchCount > 0;
            const linkTo = isLeague ? `/league/${t.id}` : `/tournaments/${t.id}`;
            return (
            <Link key={t.id} to={linkTo}
              className="group bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block">
              <div className={`h-32 relative ${['bg-gradient-to-br from-green-600 to-emerald-800', 'bg-gradient-to-br from-blue-600 to-indigo-800', 'bg-gradient-to-br from-amber-600 to-orange-800'][i % 3]}`}>
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Trophy className="w-24 h-24 text-white" />
                </div>
                <div className="absolute top-3 right-3 flex gap-1">
                  {isLeague && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white">League</span>}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[t.status] || 'bg-white/90 text-gray-700'}`}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-bold text-lg text-white leading-tight">{t.name}</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-3">
                  {isLeague ? 'Regional League — Matchplay' : (FORMAT_LABELS[t.formatType] || t.formatType)}
                </p>

                {t.ageCategory !== 'OPEN' && (
                  <span className="inline-block text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full mb-3">
                    {t.ageCategory}
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {t._count.entries} entries</span>
                    {t.pricing[0] && <span className="font-semibold text-gray-700 dark:text-gray-300">&pound;{(t.pricing[0].amountPence / 100).toFixed(2)}</span>}
                  </div>
                  <span className="text-green-700 dark:text-green-400 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    View <ArrowRight className="w-4 h-4" />
                  </span>
                </div>

                {t.registrationDeadline && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    Deadline: {new Date(t.registrationDeadline).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>
            </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

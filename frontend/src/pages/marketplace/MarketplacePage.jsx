import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ShoppingBag, MapPin, Tag, Search, Navigation } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

const TYPES = [
  { value: '', label: 'All Offers' },
  { value: 'visitor_green_fee', label: 'Visitor Green Fees' },
  { value: 'society_package', label: 'Society Packages' },
  { value: 'membership_offer', label: 'Membership Offers' },
  { value: 'lesson_package', label: 'Lesson Packages' },
];

const RADIUS_OPTIONS = [
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 100, label: '100 miles' },
];

export default function MarketplacePage() {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radius, setRadius] = useState(25);
  const [postcodeError, setPostcodeError] = useState('');
  const [activePostcode, setActivePostcode] = useState('');

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setPostcodeError('');
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (searchText.trim()) params.set('search', searchText.trim());
      if (activePostcode) {
        params.set('postcode', activePostcode);
        params.set('radius', radius);
      }
      const qs = params.toString();
      const data = await api.get(`/marketplace${qs ? `?${qs}` : ''}`);
      setOfferings(data.offerings || []);
    } catch (err) {
      if (err.message?.includes('Invalid postcode')) {
        setPostcodeError('Invalid postcode — please check and try again');
        setOfferings([]);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchText, activePostcode, radius]);

  useEffect(() => { loadOffers(); }, [typeFilter, activePostcode, radius]);

  // Debounce text search
  useEffect(() => {
    const timer = setTimeout(() => loadOffers(), 400);
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
      <PageHeader title="Course Marketplace" subtitle="Discover green fee discounts, society packages, and special offers" icon={ShoppingBag} gradient="amber" compact />
      <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
      </div>

      {/* Search bar */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Free text search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search offers, clubs, descriptions..."
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
                className="border dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm w-44 focus:ring-2 focus:ring-green-500 outline-none"
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
          <p className="text-xs text-green-700">Showing offers within {radius} miles of {activePostcode}</p>
        )}
        {postcodeError && <p className="text-xs text-red-600">{postcodeError}</p>}
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map(t => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              typeFilter === t.value ? 'bg-green-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : offerings.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offerings.map(o => (
            <div key={o.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded capitalize">
                    {o.offeringType.replace(/_/g, ' ')}
                  </span>
                  {o.originalPricePence > o.pricePence && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {Math.round((1 - o.pricePence / o.originalPricePence) * 100)}% off
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{o.title}</h3>
                {o.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{o.description}</p>}
                <Link to={`/clubs/${o.club.slug}`} className="text-sm text-green-700 hover:underline mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {o.club.name}
                  {o.club.city && <span className="text-gray-400">— {o.club.city}</span>}
                </Link>
                {o.distance != null && (
                  <p className="text-xs text-blue-600 mt-1">{o.distance.toFixed(1)} miles away</p>
                )}
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-2xl font-bold text-green-700">&pound;{((o.pricePence || 0) / 100).toFixed(2)}</span>
                  {o.originalPricePence > o.pricePence && (
                    <span className="text-gray-400 line-through text-sm">&pound;{(o.originalPricePence / 100).toFixed(2)}</span>
                  )}
                </div>
                {o.validTo && <p className="text-xs text-gray-400 mt-2">Valid until {new Date(o.validTo).toLocaleDateString('en-GB')}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No offers found</p>
          <p className="text-sm mt-1">
            {searchText || activePostcode ? 'Try adjusting your search or expanding the radius.' : 'Check back soon for deals from participating clubs.'}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

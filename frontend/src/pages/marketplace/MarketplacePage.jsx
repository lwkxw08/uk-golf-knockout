import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ShoppingBag, MapPin, Tag } from 'lucide-react';

const TYPES = [
  { value: '', label: 'All Offers' },
  { value: 'visitor_green_fee', label: 'Visitor Green Fees' },
  { value: 'society_package', label: 'Society Packages' },
  { value: 'membership_offer', label: 'Membership Offers' },
  { value: 'lesson_package', label: 'Lesson Packages' },
];

export default function MarketplacePage() {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const params = typeFilter ? `?type=${typeFilter}` : '';
    api.get(`/marketplace${params}`).then(data => setOfferings(data.offerings || []))
      .catch(console.error).finally(() => setLoading(false));
  }, [typeFilter]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><ShoppingBag className="w-8 h-8 text-green-700" /> Course Marketplace</h1>
        <p className="text-gray-600 mt-2">Discover green fee discounts, society packages, and special offers from participating clubs.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map(t => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              typeFilter === t.value ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{t.label}</button>
        ))}
      </div>

      {offerings.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offerings.map(o => (
            <div key={o.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded capitalize">
                    {o.offeringType.replace(/_/g, ' ')}
                  </span>
                  {o.originalPricePence > o.pricePence && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {Math.round((1 - o.pricePence / o.originalPricePence) * 100)}% off
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg">{o.title}</h3>
                {o.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{o.description}</p>}
                <Link to={`/clubs/${o.club.slug}`} className="text-sm text-green-700 hover:underline mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {o.club.name}
                  {o.club.city && <span className="text-gray-400">— {o.club.city}</span>}
                </Link>
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
          <p className="font-medium">No offers available yet</p>
          <p className="text-sm mt-1">Check back soon for deals from participating clubs.</p>
        </div>
      )}
    </div>
  );
}

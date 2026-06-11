import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function SponsorBanner({ placement, tournamentId, clubId, matchId, className = '' }) {
  const [ads, setAds] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tournamentId) params.set('tournamentId', tournamentId);
    if (clubId) params.set('clubId', clubId);
    if (matchId) params.set('matchId', matchId);
    params.set('limit', '5');

    api.get(`/sponsor-ads/placement/${placement}?${params.toString()}`)
      .then((data) => setAds(data.ads || []))
      .catch(() => {});
  }, [placement, tournamentId, clubId, matchId]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % ads.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (ads.length === 0) return null;

  const ad = ads[current];

  const handleClick = () => {
    api.post(`/sponsor-ads/click/${ad.id}`, { placement, matchId, tournamentId }).catch(() => {});
    if (ad.website) window.open(ad.website, '_blank');
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${className}`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition" onClick={handleClick}>
        {ad.adImageUrl ? (
          <img src={ad.adImageUrl} alt={ad.name} className="h-12 w-auto max-w-[120px] object-contain" />
        ) : ad.logoUrl ? (
          <img src={ad.logoUrl} alt={ad.name} className="h-10 w-10 object-contain rounded" />
        ) : (
          <div className="h-10 w-10 bg-green-100 rounded flex items-center justify-center text-green-700 font-bold text-xs">
            {ad.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Sponsored</p>
          <p className="text-sm font-medium text-gray-800 truncate">{ad.adText || ad.name}</p>
        </div>
        {ads.length > 1 && (
          <div className="flex gap-0.5">
            {ads.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === current ? 'bg-green-600' : 'bg-gray-300'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

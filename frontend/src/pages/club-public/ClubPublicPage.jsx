import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Building2, Users, Calendar, Trophy, MapPin, ExternalLink, ShoppingBag, Phone, Mail, Globe, Camera } from 'lucide-react';

export default function ClubPublicPage() {
  const { slug } = useParams();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/clubs/${slug}`).then(setClub).catch(console.error).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!club) return <div className="text-center py-12 text-gray-500">Club not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl p-8 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Building2 className="w-8 h-8" /> {club.name}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-green-200 text-sm">
              {club.region && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {club.region.name}</span>}
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {club._count?.players || 0} members</span>
              {club.city && <span>{club.city}{club.county ? `, ${club.county}` : ''}{club.postcode ? ` ${club.postcode}` : ''}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/clubs/${slug}/scorecard`} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition">
              View Scorecard
            </Link>
            {club.id && (
              <Link to={`/clubs/${club.id}/gallery`} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1">
                <Camera className="w-4 h-4" /> Gallery
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* About */}
          {club.description && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-3">About</h2>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{club.description}</p>
            </div>
          )}

          {/* Course Data */}
          {(club.slopeRating || club.courseRating || club.par) && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-3">Course Information</h2>
              <div className="grid grid-cols-3 gap-4">
                {club.slopeRating && (
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Slope Rating</p>
                    <p className="text-2xl font-bold text-green-800">{club.slopeRating}</p>
                  </div>
                )}
                {club.courseRating && (
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Course Rating</p>
                    <p className="text-2xl font-bold text-green-800">{Number(club.courseRating).toFixed(1)}</p>
                  </div>
                )}
                {club.par && (
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500">Par</p>
                    <p className="text-2xl font-bold text-green-800">{club.par}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fixtures */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-green-700" /> Upcoming Fixtures</h2>
            {club.fixtures?.length > 0 ? (
              <div className="space-y-3">
                {club.fixtures.map((f, i) => (
                  <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{f.tournament?.name}</p>
                      <p className="text-xs text-gray-500">{f.playerA?.firstName} {f.playerA?.lastName} vs {f.playerB?.firstName || 'TBD'} {f.playerB?.lastName || ''}</p>
                    </div>
                    {f.scheduledDate && <span className="text-xs text-gray-400">{new Date(f.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">No upcoming fixtures</p>}
          </div>

          {/* Recent Results */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-green-700" /> Recent Results</h2>
            {club.results?.length > 0 ? (
              <div className="space-y-3">
                {club.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{r.tournament?.name}</p>
                      <p className="text-xs text-gray-500">{r.playerA?.firstName} {r.playerA?.lastName} vs {r.playerB?.firstName} {r.playerB?.lastName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-700">{r.winner?.firstName} {r.winner?.lastName}</p>
                      <p className="text-xs text-gray-400">{r.result?.resultText}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">No results yet</p>}
          </div>

          {/* Rankings */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-green-700" /> Club Rankings</h2>
            {club.rankings?.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500"><th className="pb-2">#</th><th className="pb-2">Player</th><th className="pb-2">Handicap</th><th className="pb-2">Points</th></tr></thead>
                <tbody>{club.rankings.map((p, i) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 font-bold text-gray-400">{i + 1}</td>
                    <td className="py-2 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="py-2">{p.handicapIndex ? Number(p.handicapIndex).toFixed(1) : '-'}</td>
                    <td className="py-2 font-semibold text-green-700">{p.rankingPoints}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-gray-500 text-sm">No ranked players yet</p>}
          </div>

          {/* Course Offerings */}
          {club.offerings?.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-green-700" /> Offers & Packages</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {club.offerings.map(o => (
                  <div key={o.id} className="border rounded-lg p-4">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded capitalize">{o.offeringType.replace(/_/g, ' ')}</span>
                    <h3 className="font-medium mt-2">{o.title}</h3>
                    {o.description && <p className="text-sm text-gray-600 mt-1">{o.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-bold text-green-700">&pound;{((o.pricePence || 0) / 100).toFixed(2)}</span>
                      {o.originalPricePence > o.pricePence && <span className="text-gray-400 line-through text-sm">&pound;{(o.originalPricePence / 100).toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          {(club.phone || club.email || club.website || club.address) && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-3 text-sm">
                {club.address && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p>{club.address}</p>
                      {club.city && <p>{club.city}{club.county ? `, ${club.county}` : ''}</p>}
                      {club.postcode && <p>{club.postcode}</p>}
                    </div>
                  </div>
                )}
                {club.phone && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${club.phone}`} className="hover:text-green-600">{club.phone}</a>
                  </p>
                )}
                {club.email && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${club.email}`} className="hover:text-green-600">{club.email}</a>
                  </p>
                )}
                {club.website && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a href={club.website} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">{club.website.replace(/^https?:\/\//, '')}</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sponsors */}
          {club.sponsors?.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Our Sponsors</h3>
              <div className="space-y-4">
                {club.sponsors.map(s => (
                  <div key={s.id} className="border rounded-lg p-4 text-center">
                    {s.logoUrl && <img src={s.logoUrl} alt={s.name} className="max-h-12 mx-auto mb-2 object-contain" />}
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{s.tier.toLowerCase()} sponsor</p>
                    {s.websiteUrl && (
                      <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="text-green-600 text-xs hover:underline flex items-center justify-center gap-1 mt-1">
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map placeholder */}
          {club.latitude && club.longitude && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold mb-3">Location</h3>
              <a href={`https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`}
                target="_blank" rel="noreferrer"
                className="block bg-gray-100 rounded-lg p-8 text-center hover:bg-gray-200 transition">
                <MapPin className="w-8 h-8 text-green-700 mx-auto mb-2" />
                <p className="text-sm text-gray-600">View on Google Maps</p>
              </a>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <h3 className="font-semibold text-green-800">Advertise Here</h3>
            <p className="text-sm text-green-700 mt-2">Promote your business to golfers at {club.name}.</p>
            <p className="text-xs text-green-600 mt-2">Contact us for sponsorship opportunities.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

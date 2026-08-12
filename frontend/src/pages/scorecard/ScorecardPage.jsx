import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import PageHeader from '../../components/layout/PageHeader';
import { ArrowLeft, MapPin } from 'lucide-react';

export default function ScorecardPage() {
  const { slug } = useParams();
  const [club, setClub] = useState(null);
  const [selectedTee, setSelectedTee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/clubs/${slug}/scorecard`)
      .then(data => {
        setClub(data);
        if (data.tees?.length > 0) setSelectedTee(0);
      })
      .catch(err => setError(err.message || 'Failed to load scorecard'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading scorecard...</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!club) return <div className="text-center py-20 text-gray-500">Club not found</div>;

  const tee = club.tees?.[selectedTee];
  const front = tee?.holes?.filter(h => h.holeNumber <= 9) || [];
  const back = tee?.holes?.filter(h => h.holeNumber > 9 && h.holeNumber <= 18) || [];
  const sum = (arr, key) => arr.reduce((s, h) => s + (h[key] || 0), 0);

  return (
    <div>
      <PageHeader title={club.name} subtitle="Course Scorecard" icon={ArrowLeft} gradient="green" compact
        breadcrumbs={[{ label: 'Clubs', to: '/clubs' }, { label: club.name, to: `/clubs/${slug}` }, { label: 'Scorecard' }]}
      />
      <div className="max-w-6xl mx-auto px-4 py-8">

      {(!club.tees || club.tees.length === 0) ? (
        <div className="bg-gray-50 dark:bg-gray-900 border rounded-xl p-8 text-center">
          <p className="text-gray-500">No scorecard data available for this club yet.</p>
          <p className="text-gray-400 text-sm mt-1">Scorecard data is loaded when the club is linked to the course database.</p>
        </div>
      ) : (
        <>
          {/* Tee selector tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {club.tees.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setSelectedTee(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedTee === i
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.teeName} ({t.gender === 'female' ? 'Women' : 'Men'})
              </button>
            ))}
          </div>

          {/* Tee summary */}
          {tee && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-green-600 text-xs">Tee</p>
                <p className="font-bold text-green-900">{tee.teeName}</p>
              </div>
              <div>
                <p className="text-green-600 text-xs">Slope Rating</p>
                <p className="font-bold text-green-900">{tee.slopeRating || '—'}</p>
              </div>
              <div>
                <p className="text-green-600 text-xs">Course Rating</p>
                <p className="font-bold text-green-900">{tee.courseRating || '—'}</p>
              </div>
              <div>
                <p className="text-green-600 text-xs">Par</p>
                <p className="font-bold text-green-900">{tee.par || '—'}</p>
              </div>
              <div>
                <p className="text-green-600 text-xs">Total Yards</p>
                <p className="font-bold text-green-900">{tee.totalYards?.toLocaleString() || '—'}</p>
              </div>
            </div>
          )}

          {/* Scorecard table */}
          {tee?.holes?.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-green-700 text-white">
                    <th className="px-3 py-2.5 text-left font-medium">Hole</th>
                    {front.map(h => (
                      <th key={h.holeNumber} className="px-2 py-2.5 text-center font-medium">{h.holeNumber}</th>
                    ))}
                    <th className="px-2 py-2.5 text-center font-bold bg-green-800">Out</th>
                    {back.map(h => (
                      <th key={h.holeNumber} className="px-2 py-2.5 text-center font-medium">{h.holeNumber}</th>
                    ))}
                    <th className="px-2 py-2.5 text-center font-bold bg-green-800">In</th>
                    <th className="px-2 py-2.5 text-center font-bold bg-green-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Par</td>
                    {front.map(h => <td key={h.holeNumber} className="px-2 py-2 text-center">{h.par}</td>)}
                    <td className="px-2 py-2 text-center font-bold bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">{sum(front, 'par')}</td>
                    {back.map(h => <td key={h.holeNumber} className="px-2 py-2 text-center">{h.par}</td>)}
                    <td className="px-2 py-2 text-center font-bold bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">{sum(back, 'par')}</td>
                    <td className="px-2 py-2 text-center font-bold bg-gray-100 dark:bg-gray-700">{sum(front, 'par') + sum(back, 'par')}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Yards</td>
                    {front.map(h => <td key={h.holeNumber} className="px-2 py-2 text-center text-xs">{h.yards}</td>)}
                    <td className="px-2 py-2 text-center font-bold bg-gray-50 dark:bg-gray-900 text-xs">{sum(front, 'yards')}</td>
                    {back.map(h => <td key={h.holeNumber} className="px-2 py-2 text-center text-xs">{h.yards}</td>)}
                    <td className="px-2 py-2 text-center font-bold bg-gray-50 dark:bg-gray-900 text-xs">{sum(back, 'yards')}</td>
                    <td className="px-2 py-2 text-center font-bold bg-gray-100 text-xs">{sum(front, 'yards') + sum(back, 'yards')}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">S.I.</td>
                    {front.map(h => <td key={h.holeNumber} className="px-2 py-2 text-center text-gray-500">{h.strokeIndex || '—'}</td>)}
                    <td className="px-2 py-2 bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50"></td>
                    {back.map(h => <td key={h.holeNumber} className="px-2 py-2 text-center text-gray-500">{h.strokeIndex || '—'}</td>)}
                    <td className="px-2 py-2 bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50"></td>
                    <td className="px-2 py-2 bg-gray-100 dark:bg-gray-700"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 border rounded-xl p-8 text-center">
              <p className="text-gray-500">No hole-by-hole data available for {tee?.teeName} tees.</p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

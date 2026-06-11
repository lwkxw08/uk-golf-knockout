import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { FileText, Download, Printer, Trophy, Users, MapPin, Calendar, Award } from 'lucide-react';

export default function TournamentProgrammePage() {
  const { tournamentId } = useParams();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/programme/${tournamentId}`)
      .then(setProgramme)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const handlePrint = () => window.print();

  if (loading) return <div className="text-center py-12 text-gray-500">Generating programme...</div>;
  if (!programme) return <div className="text-center py-12 text-red-500">Failed to load programme</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Print controls - hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" /> Tournament Programme
        </h1>
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Programme Content */}
      <div className="bg-white rounded-xl shadow-sm border print:shadow-none print:border-0">
        {/* Cover / Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-8 rounded-t-xl print:rounded-none text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h2 className="text-3xl font-bold">{programme.title}</h2>
          <p className="text-green-200 mt-2">{programme.season} Season</p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-green-100">
            <span>{programme.format}</span>
            <span>\u2022</span>
            <span>{programme.totalEntrants} Entrants</span>
            <span>\u2022</span>
            <span>{programme.scoring}</span>
          </div>
        </div>

        {/* Description & Rules */}
        {programme.description && (
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900 mb-2">About the Tournament</h3>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{programme.description}</p>
          </div>
        )}

        {/* Key Dates */}
        <div className="p-6 border-b">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-600" /> Key Dates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {programme.dates.registration && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Registration Deadline</p>
                <p className="font-medium text-sm">{new Date(programme.dates.registration).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {programme.dates.start && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Tournament Start</p>
                <p className="font-medium text-sm">{new Date(programme.dates.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {programme.dates.end && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Final</p>
                <p className="font-medium text-sm">{new Date(programme.dates.end).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
          </div>
        </div>

        {/* Entrants */}
        <div className="p-6 border-b">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-600" /> Entrants ({programme.totalEntrants})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {programme.entrants.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-4">{i + 1}</span>
                  <span className="font-medium text-gray-800">{e.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{e.club}</span>
                  {e.handicap !== null && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{e.handicap}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixtures / Bracket */}
        <div className="p-6 border-b">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-green-600" /> {programme.isKnockout ? 'Draw & Results' : 'League Fixtures'}
          </h3>
          {Object.entries(programme.fixtures).map(([round, matches]) => (
            <div key={round} className="mb-4">
              <h4 className="font-medium text-gray-700 text-sm mb-2 bg-gray-50 px-3 py-1.5 rounded">{round}</h4>
              <div className="space-y-1 ml-2">
                {matches.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1">
                    <span className="font-medium text-gray-800 w-40 truncate">{m.playerA || m.home}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="font-medium text-gray-800 w-40 truncate">{m.playerB || m.away}</span>
                    {(m.result || m.resultText) && (
                      <span className="text-xs text-green-600 ml-2">({m.result || m.resultText})</span>
                    )}
                    {m.venue && <span className="text-xs text-gray-400 ml-auto">{m.venue}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Clubs / Venues */}
        {programme.clubs.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" /> Participating Clubs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {programme.clubs.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.address}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    {c.par && <span>Par {c.par}</span>}
                    {c.slopeRating && <span>Slope {c.slopeRating}</span>}
                    {c.courseRating && <span>CR {c.courseRating}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prizes */}
        {programme.prizes.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" /> Prizes
            </h3>
            <div className="space-y-2">
              {programme.prizes.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700">{p.description}</span>
                  {p.valuePence && <span className="text-sm font-medium text-green-700">\u00a3{(p.valuePence / 100).toFixed(0)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sponsors */}
        {programme.sponsors.length > 0 && (
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Sponsors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {programme.sponsors.map((s, i) => (
                <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} className="h-10 mx-auto mb-2 object-contain" />
                  ) : (
                    <div className="w-10 h-10 bg-green-100 rounded mx-auto mb-2 flex items-center justify-center text-green-700 font-bold text-xs">
                      {s.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-700">{s.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{s.tier}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 p-4 rounded-b-xl text-center text-xs text-gray-400 border-t">
          Generated by UK Golf Knockout \u2022 {new Date(programme.generatedAt).toLocaleDateString('en-GB')}
        </div>
      </div>
    </div>
  );
}

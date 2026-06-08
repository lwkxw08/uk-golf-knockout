import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import KnockoutBracket from '../../components/bracket/KnockoutBracket';
import { Trophy, Users, Calendar, Clock, Eye } from 'lucide-react';

const FORMAT_LABELS = {
  SINGLES_MATCHPLAY: 'Singles Matchplay', SINGLES_STROKEPLAY: 'Singles Strokeplay',
  SINGLES_STABLEFORD: 'Singles Stableford', PAIRS_MATCHPLAY: 'Pairs Matchplay',
  PAIRS_BESTBALL: 'Pairs Best Ball', PAIRS_FOURSOMES: 'Pairs Foursomes',
  PAIRS_GREENSOMES: 'Pairs Greensomes', TEAM_MATCHPLAY: 'Team Matchplay',
  TEAM_STROKEPLAY: 'Team Strokeplay', TEAM_STABLEFORD: 'Team Stableford',
};

export default function TournamentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [bracket, setBracket] = useState(null);
  const [activeStage, setActiveStage] = useState('CLUB_QUALIFIER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tournaments/${id}`)
      .then(setTournament)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api.get(`/matches/${id}/bracket?stage=${activeStage}`)
      .then(setBracket)
      .catch(() => setBracket(null));
  }, [id, activeStage]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!tournament) return <div className="text-center py-12 text-gray-500">Tournament not found</div>;

  const entryFee = tournament.pricing?.find(p => p.feeType === 'ENTRY_FEE');
  const upcomingDraw = tournament.draws?.find(d => d.status === 'SCHEDULED');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
            <p className="text-green-200 text-lg">{FORMAT_LABELS[tournament.formatType]}</p>
            <div className="flex gap-4 mt-4 text-green-200 text-sm">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {tournament._count.entries} entries</span>
              <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> {tournament.season}</span>
              {tournament.ageCategory !== 'OPEN' && (
                <span className="bg-white/20 px-2 py-0.5 rounded">{tournament.ageCategory}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {entryFee && (
              <div className="text-right">
                <span className="text-3xl font-bold">&pound;{(entryFee.amountPence / 100).toFixed(2)}</span>
                <span className="text-green-200 text-sm block">entry fee</span>
              </div>
            )}
            {tournament.status === 'REGISTRATION_OPEN' && user && (
              <Link to={`/tournaments/${id}/enter`}
                className="bg-white text-green-800 hover:bg-green-50 px-6 py-2 rounded-lg font-semibold transition text-center">
                Enter Tournament
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Draw */}
      {upcomingDraw && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Live Draw Scheduled</h3>
              <p className="text-blue-700 text-sm">
                <Calendar className="w-4 h-4 inline mr-1" />
                {new Date(upcomingDraw.scheduledAt).toLocaleString('en-GB')}
              </p>
            </div>
          </div>
          <Link to={`/draws/${tournament.id}/live`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
            Watch Live Draw
          </Link>
        </div>
      )}

      {/* Details */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tournament Details</h2>
          <div className="bg-white border rounded-xl p-6 space-y-4">
            {tournament.description && <p className="text-gray-600">{tournament.description}</p>}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Format</span>
                <p className="font-medium">{FORMAT_LABELS[tournament.formatType]}</p>
              </div>
              <div>
                <span className="text-gray-500">Scoring</span>
                <p className="font-medium">{tournament.scoringSystem}</p>
              </div>
              <div>
                <span className="text-gray-500">Handicap Allowance</span>
                <p className="font-medium">{tournament.handicapAllowancePct}%</p>
              </div>
              {tournament.maxHandicap && (
                <div>
                  <span className="text-gray-500">Max Handicap</span>
                  <p className="font-medium">{Number(tournament.maxHandicap).toFixed(1)}</p>
                </div>
              )}
              {tournament.registrationDeadline && (
                <div>
                  <span className="text-gray-500">Registration Deadline</span>
                  <p className="font-medium">{new Date(tournament.registrationDeadline).toLocaleDateString('en-GB')}</p>
                </div>
              )}
            </div>

            {tournament.rulesText && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-2">Rules</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{tournament.rulesText}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stages & Pricing sidebar */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Stages</h2>
            <div className="bg-white border rounded-xl p-4 space-y-3">
              {tournament.stages?.map((s) => (
                <div key={s.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium text-sm">{s.name}</span>
                  <span className="text-xs text-gray-500">{s.totalRounds} rounds</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing</h2>
            <div className="bg-white border rounded-xl p-4 space-y-3">
              {tournament.pricing?.filter(p => p.isActive).map((p) => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{p.feeType.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-500 block">Club {p.clubSharePct}% / Platform {p.platformSharePct}%</span>
                  </div>
                  <span className="font-semibold">&pound;{(p.amountPence / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Knockout Bracket</h2>
          <div className="flex gap-2">
            {['CLUB_QUALIFIER', 'REGIONAL', 'NATIONAL_FINAL'].map((stage) => (
              <button key={stage} onClick={() => setActiveStage(stage)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeStage === stage ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {stage.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 overflow-x-auto">
          {bracket ? (
            <KnockoutBracket rounds={bracket.rounds} totalRounds={bracket.totalRounds} roundLabels={bracket.roundLabels} />
          ) : (
            <p className="text-gray-500 text-center py-8">Draw not yet made for this stage</p>
          )}
        </div>
      </div>
    </div>
  );
}

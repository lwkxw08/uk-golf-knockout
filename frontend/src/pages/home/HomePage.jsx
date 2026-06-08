import { Link } from 'react-router-dom';
import { Trophy, Users, MapPin, Award, Banknote, Calendar } from 'lucide-react';

const features = [
  { icon: Trophy, title: 'National Knockout', desc: 'Club qualifiers feed into regional and national knockout stages' },
  { icon: Users, title: 'Multiple Formats', desc: 'Singles, pairs, teams — matchplay, strokeplay, stableford, best ball' },
  { icon: MapPin, title: 'Club Network', desc: 'Clubs earn revenue from entry fees, visitors, sponsors and more' },
  { icon: Award, title: 'Live Rankings', desc: 'National ranking points across all competitions' },
  { icon: Banknote, title: 'Revenue Sharing', desc: 'Transparent revenue splits between clubs and the platform' },
  { icon: Calendar, title: 'Live Draws', desc: 'Watch the draw unfold live at scheduled times' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 to-green-950 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Trophy className="w-16 h-16" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            UK Golf Club<br />Knockout Network
          </h1>
          <p className="text-xl text-green-200 mb-8 max-w-2xl mx-auto">
            The national matchplay competition platform connecting golf clubs,
            players and sponsors across the UK.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-green-800 hover:bg-green-50 px-8 py-3 rounded-lg font-semibold text-lg transition"
            >
              Enter Now
            </Link>
            <Link
              to="/tournaments"
              className="border-2 border-white hover:bg-white/10 px-8 py-3 rounded-lg font-semibold text-lg transition"
            >
              View Tournaments
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 text-green-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h3 className="font-semibold text-lg mb-2">Club Hosts Qualifier</h3>
              <p className="text-gray-600">Members enter through the platform. Club earns entry fee share and promotes participation.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 text-green-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h3 className="font-semibold text-lg mb-2">Knockout Matches</h3>
              <p className="text-gray-600">Players arrange matches themselves. Both players sign off results and upload scorecards.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 text-green-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h3 className="font-semibold text-lg mb-2">Progress to Finals</h3>
              <p className="text-gray-600">Winners advance through regional to national finals. Watch the live draw for each round.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <Icon className="w-8 h-8 text-green-700 mb-3" />
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Club CTA */}
      <section className="py-16 px-4 bg-green-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Golf Club? Join the Network</h2>
          <p className="text-green-200 text-lg mb-8">
            Generate additional revenue through entry fees, visitor traffic, sponsorship
            and food & beverage spend — without organising the tournament yourself.
          </p>
          <Link
            to="/register?role=club"
            className="bg-white text-green-800 hover:bg-green-50 px-8 py-3 rounded-lg font-semibold text-lg transition inline-block"
          >
            Register Your Club
          </Link>
        </div>
      </section>
    </div>
  );
}

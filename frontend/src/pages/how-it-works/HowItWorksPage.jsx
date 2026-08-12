import { Link } from 'react-router-dom';
import { Compass, UserPlus, Search, Swords, Trophy, BarChart3, Users, ArrowRight, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

const STEPS = [
  {
    icon: UserPlus,
    step: 1,
    title: 'Register & Set Up Your Profile',
    desc: 'Create your Luna Golf account in under a minute. Enter your WHS handicap, select your home club, and you\'re ready to compete.',
    details: ['Free to register', 'Automatic handicap sync from WHS', 'Link to your home club', 'Upload a profile photo'],
    color: 'green'
  },
  {
    icon: Search,
    step: 2,
    title: 'Find a Tournament',
    desc: 'Browse active tournaments by region, format, or search by postcode. Find events at your local clubs or explore new courses across the UK.',
    details: ['Search by postcode and radius', 'Filter by age, gender, or handicap category', 'View entry fees and prizes', 'See which clubs are participating'],
    color: 'blue'
  },
  {
    icon: Swords,
    step: 3,
    title: 'Enter & Get Drawn',
    desc: 'Pay your entry fee and you\'re in. Once entries close, the draw is made — handicap-seeded to ensure fair matchups from round one.',
    details: ['Handicap-based seeding for fair draws', 'Automated bracket generation', 'Live draw events you can watch', 'Fixture dates assigned automatically'],
    color: 'amber'
  },
  {
    icon: Trophy,
    step: 4,
    title: 'Play Your Matches',
    desc: 'Arrange matches with your opponent via in-app chat. Play your round, submit scores, and watch the bracket update in real time.',
    details: ['In-app match chat for arrangements', 'Live hole-by-hole scoring', 'Both players confirm results', 'Automated bracket progression'],
    color: 'purple'
  },
  {
    icon: BarChart3,
    step: 5,
    title: 'Climb the Rankings',
    desc: 'Every match earns ranking points. Win matches, rise through the leaderboard, and qualify for the national final. Your stats build throughout the season.',
    details: ['Season-long ranking system', 'Regional league points table', 'Head-to-head records tracked', 'Top players qualify for National Final'],
    color: 'emerald'
  },
  {
    icon: Users,
    step: 6,
    title: 'Connect & Share',
    desc: 'Follow players, post about your rounds, share photos and videos, and join the growing Luna Golf community. Golf is better together.',
    details: ['Social feed for the community', 'Share a Round — find playing partners', 'Follow favourite players', 'Photo and video posts'],
    color: 'pink'
  },
];

const colorMap = {
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
};

export default function HowItWorksPage() {
  return (
    <div>
      <PageHeader title="How It Works" subtitle="From registration to the national final — your journey starts here" icon={Compass} gradient="green" compact />
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Steps */}
        <div className="space-y-8">
          {STEPS.map((step, i) => {
            const colors = colorMap[step.color];
            return (
              <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-8 hover:shadow-lg transition">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="shrink-0">
                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center`}>
                      <step.icon className={`w-8 h-8 ${colors.text}`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold ${colors.text} ${colors.bg} px-2.5 py-0.5 rounded-full`}>Step {step.step}</span>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{step.title}</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{step.desc}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {step.details.map((d, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 ${colors.text} shrink-0`} />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex justify-center mt-6">
                    <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Format Explained */}
        <section className="mt-16 mb-12">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">Competition Formats</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <Swords className="w-8 h-8 text-green-700 dark:text-green-400 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Knockout</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Classic matchplay bracket. Win and progress, lose and you're out. Draws are seeded by handicap so top seeds don't meet early.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <BarChart3 className="w-8 h-8 text-blue-700 dark:text-blue-400 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">League</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Round-robin format within regional groups. Points for wins, draws, and bonus points for decisive victories. Top finishers advance.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6">
              <Trophy className="w-8 h-8 text-amber-700 dark:text-amber-400 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">National Final</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Regional winners and top league finishers compete in the end-of-season National Final at a prestigious venue.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-green-700 to-emerald-700 rounded-2xl p-10 text-center text-white">
          <h2 className="text-2xl font-extrabold mb-3">Ready to Get Started?</h2>
          <p className="text-green-100 mb-6">Registration takes less than a minute. Find your first tournament today.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="bg-white text-green-800 font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition">Register Now</Link>
            <Link to="/tournaments" className="border-2 border-white/50 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition">Browse Tournaments</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

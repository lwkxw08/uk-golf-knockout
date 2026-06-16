import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import {
  Trophy, Users, MapPin, Calendar, ChevronRight, Star,
  Clock, TrendingUp, Award, Zap, ArrowRight, Heart,
  UserPlus, Globe, Shield, Target
} from 'lucide-react';

function AnimatedCounter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = Math.ceil(end / (duration / 16));
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(start);
        }, 16);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [teeTimes, setTeeTimes] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ players: 0, clubs: 0, matches: 0, tournaments: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tourns, tt, feed] = await Promise.all([
        api.get('/tournaments').catch(() => []),
        api.get('/social/tee-times').catch(() => ({ teeTimes: [] })),
        api.get('/social/posts/discover?limit=4').catch(() => ({ posts: [] })),
      ]);
      setTournaments(Array.isArray(tourns) ? tourns.slice(0, 3) : (tourns?.tournaments || []).slice(0, 3));
      setTeeTimes(tt.teeTimes?.slice(0, 3) || []);
      setPosts(feed.posts?.slice(0, 4) || []);

      const [playersResp, clubsResp] = await Promise.all([
        api.get('/players?limit=1').catch(() => ({ total: 24 })),
        api.get('/clubs').catch(() => []),
      ]);
      setStats({
        players: playersResp?.total || 24,
        clubs: Array.isArray(clubsResp) ? clubsResp.length : (clubsResp?.clubs?.length || 8),
        matches: 156,
        tournaments: Array.isArray(tourns) ? tourns.length : (tourns?.tournaments?.length || 4),
      });
    } catch {}
  };

  return (
    <div className="-mt-16 min-h-screen bg-white dark:bg-gray-950">

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-gray-950" />

        <div className="relative max-w-7xl mx-auto px-4 pt-32 pb-28 md:pt-40 md:pb-36">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 mb-6">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-green-100">Season 2027 — Now Open for Entries</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
                Compete.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">Connect.</span><br />
                Play.
              </h1>
              <p className="text-lg text-green-100 mb-8 max-w-lg leading-relaxed">
                The UK's premier matchplay knockout platform. Enter through your local club,
                compete through regional rounds, and battle your way to the national finals.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/tournaments" className="group flex items-center justify-center gap-2 bg-white text-green-800 hover:bg-amber-50 px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg shadow-black/20">
                  Find a Tournament <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/register" className="flex items-center justify-center gap-2 border-2 border-white/40 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-semibold text-lg transition backdrop-blur">
                  <UserPlus className="w-5 h-5" /> Join Free
                </Link>
              </div>
            </div>

            <div className="hidden md:block relative">
              <div className="absolute -top-4 -left-4 w-full h-full bg-amber-400/20 rounded-2xl rotate-3" />
              <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-10 h-10 text-amber-400" />
                  <div>
                    <p className="text-white font-bold text-lg text-gray-900 dark:text-white">2027 National Knockout</p>
                    <p className="text-green-200 text-sm">Entries closing soon</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { val: stats.players, label: 'Players Entered' },
                    { val: stats.clubs, label: 'Clubs' },
                    { val: '£500', label: 'Prize Pool' },
                    { val: '6', label: 'Game Weeks' },
                  ].map(({ val, label }) => (
                    <div key={label} className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{val}</p>
                      <p className="text-xs text-green-200">{label}</p>
                    </div>
                  ))}
                </div>
                <Link to="/tournaments" className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-semibold transition">
                  View Bracket & Fixtures
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="relative -mt-16 z-10 max-w-5xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: stats.players, label: 'Registered Players' },
              { val: stats.clubs, label: 'Partner Clubs' },
              { val: stats.matches, label: 'Matches Played', suffix: '+' },
              { val: stats.tournaments, label: 'Active Tournaments' },
            ].map(({ val, label, suffix }) => (
              <div key={label}>
                <p className="text-3xl md:text-4xl font-extrabold text-green-700 dark:text-green-400">
                  <AnimatedCounter end={val} suffix={suffix} />
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TOURNAMENTS */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Featured Tournaments</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Find your next competition</p>
            </div>
            <Link to="/tournaments" className="hidden md:flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold hover:text-green-800 dark:text-green-300">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {(tournaments.length > 0 ? tournaments : [
              { id: '1', name: '2027 Buckinghamshire Regional League', season: '2027', format: 'LEAGUE', status: 'ACTIVE', description: 'Regional knockout league across Buckinghamshire clubs' },
              { id: '2', name: '2027 National Singles Championship', season: '2027', format: 'KNOCKOUT', status: 'UPCOMING', description: 'The flagship national singles matchplay knockout' },
              { id: '3', name: 'Summer Pairs Invitational', season: '2027', format: 'PAIRS', status: 'UPCOMING', description: 'Better-ball pairs format across 4 weekends' },
            ]).map((t, i) => (
              <Link to={`/tournaments/${t.id}`} key={t.id} className="group bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className={`h-48 relative ${['bg-gradient-to-br from-green-600 to-emerald-800', 'bg-gradient-to-br from-blue-600 to-indigo-800', 'bg-gradient-to-br from-amber-600 to-orange-800'][i % 3]}`}>
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Trophy className="w-32 h-32 text-white" />
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.status === 'ACTIVE' || t.status === 'IN_PROGRESS' ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-700'}`}>
                      {t.status === 'ACTIVE' || t.status === 'IN_PROGRESS' ? 'LIVE' : t.status?.replace(/_/g, ' ') || 'UPCOMING'}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white/70 text-xs uppercase tracking-wider mb-1">{t.formatType || t.format || 'KNOCKOUT'} • {t.season || '2027'}</p>
                    <h3 className="text-white font-bold text-xl leading-tight">{t.name}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {t.description || 'Compete against players across the region in this exciting matchplay format.'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {['TF','MW','JR','PH'].map(initials => (
                        <div key={initials} className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-green-700">
                          {initials}
                        </div>
                      ))}
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-gray-500">+{(t._count?.entries || 12) + i * 3}</div>
                    </div>
                    <span className="text-green-700 dark:text-green-400 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Enter <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">How It Works</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-lg mx-auto">From your local club to the national finals — three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, icon: UserPlus, title: 'Register & Enter', desc: 'Create your profile, link your WHS handicap, and enter through your local club. Entry fees start from just £10.', color: 'green' },
              { step: 2, icon: Calendar, title: 'Arrange & Play', desc: 'Match with opponents, arrange tee times via in-app chat, play your matches, and submit scores — both players confirm.', color: 'blue' },
              { step: 3, icon: Trophy, title: 'Win & Progress', desc: 'Climb the knockout bracket. Winners advance through club, regional, and national stages to the Grand Final.', color: 'amber' },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 border dark:border-gray-700 shadow-sm hover:shadow-lg transition group">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${color === 'green' ? 'bg-green-100 dark:bg-green-900/50' : color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-amber-100 dark:bg-amber-900/50'}`}>
                  <Icon className={`w-7 h-7 ${color === 'green' ? 'text-green-700' : color === 'blue' ? 'text-blue-700' : 'text-amber-700'}`} />
                </div>
                <div className="absolute top-6 right-6 text-5xl font-extrabold text-gray-100 dark:text-gray-800 group-hover:text-green-100 dark:group-hover:text-green-900 transition">{step}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHARE A ROUND */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-green-700 to-emerald-900 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-white mb-4">Need a Playing Partner?</h2>
                <p className="text-green-100 text-lg mb-6 leading-relaxed">
                  Post your spare tee time and let other members join you. Browse open rounds near you,
                  express interest, and tee it up with new playing partners.
                </p>
                <Link to="/tee-times" className="inline-flex items-center gap-2 bg-white text-green-800 hover:bg-amber-50 px-6 py-3 rounded-xl font-bold transition">
                  Browse Open Rounds <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              <div className="space-y-3">
                {(teeTimes.length > 0 ? teeTimes.slice(0, 2) : [
                  { id: '1', poster: { firstName: 'James', lastName: 'R' }, club: { name: 'Buckinghamshire GC' }, teeTime: new Date(Date.now() + 2*86400000), spotsAvailable: 1, greenFeePence: 3500 },
                  { id: '2', poster: { firstName: 'Sarah', lastName: 'M' }, club: { name: 'Denham Golf Club' }, teeTime: new Date(Date.now() + 3*86400000), spotsAvailable: 1, greenFeePence: 4500 },
                ]).map(tt => (
                  <div key={tt.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{tt.poster?.firstName} {tt.poster?.lastName}</p>
                        <p className="text-green-200 text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {tt.club?.name || tt.courseName || 'Local Course'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-medium">{new Date(tt.teeTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        <p className="text-green-200 text-xs">{new Date(tt.teeTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                      <span className="text-xs text-green-200">{tt.spotsAvailable} spot{tt.spotsAvailable > 1 ? 's' : ''} available</span>
                      {tt.greenFeePence && <span className="text-xs text-amber-300 font-medium">£{(tt.greenFeePence / 100).toFixed(0)} green fee</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL FEED PREVIEW */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">From the Community</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">See what players are talking about</p>
            </div>
            <Link to="/social" className="hidden md:flex items-center gap-1 text-green-700 dark:text-green-400 font-semibold hover:text-green-800 dark:text-green-300">
              View Feed <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(posts.length > 0 ? posts : [
              { id: '1', content: 'Great round today at Buckinghamshire GC! Shot a 78 off the back tees.', player: { firstName: 'Tommy', lastName: 'F' }, likesCount: 12, commentsCount: 3, createdAt: new Date() },
              { id: '2', content: 'Finally broke 80 this season! Putting was on fire.', player: { firstName: 'Matt', lastName: 'W' }, likesCount: 8, commentsCount: 5, createdAt: new Date() },
              { id: '3', content: 'Tournament prep — hitting the range 4 times this week.', player: { firstName: 'James', lastName: 'R' }, likesCount: 6, commentsCount: 1, createdAt: new Date() },
              { id: '4', content: 'What a day for the club championship! Net 68, buzzing!', player: { firstName: 'Sarah', lastName: 'M' }, likesCount: 15, commentsCount: 7, createdAt: new Date() },
            ]).map(post => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-bold text-green-700">
                    {post.player.firstName[0]}{post.player.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{post.player.firstName} {post.player.lastName}</p>
                    <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">{post.content}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likesCount}</span>
                  <span>{post.commentsCount} comments</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Everything You Need to Compete</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">A complete platform for players, clubs, and sponsors</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Target, title: 'Live Match Tracking', desc: 'Real-time scoring with hole-by-hole updates', color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
              { icon: TrendingUp, title: 'WHS Handicap Sync', desc: 'Auto-pulls from WHS — always up to date', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/30' },
              { icon: Users, title: 'Social Community', desc: 'Follow players, share rounds, post updates', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
              { icon: Calendar, title: 'Calendar Sync', desc: 'Export fixtures to Google/Apple Calendar', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
              { icon: MapPin, title: 'Course Weather', desc: 'Live forecast for every course you play', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30' },
              { icon: Shield, title: 'QR Check-In', desc: 'Scan to check in — match starts when both arrive', color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
              { icon: Star, title: 'Sponsor Banners', desc: 'Dynamic ad rotation with impression tracking', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
              { icon: Globe, title: 'PWA Mobile App', desc: 'Install on your phone — works offline', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 hover:shadow-md transition group">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLUB CTA */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-900/50 rounded-full px-4 py-1.5 mb-6">
            <Award className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300">Club Partnership Programme</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Golf Club? Join the Network</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Generate additional revenue through entry fees, visitor traffic, sponsorship
            and increased F&B spend — without organising the tournament yourself.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
            {[
              { label: 'Entry Fee Share', value: '40%' },
              { label: 'Visitor Green Fees', value: '100%' },
              { label: 'Sponsor Revenue', value: 'Tiered' },
              { label: 'Setup Cost', value: 'Free' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-400">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <Link to="/register?role=club" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition">
            Register Your Club <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

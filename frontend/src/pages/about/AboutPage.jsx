import { Link } from 'react-router-dom';
import { Trophy, Target, Users, Heart, Globe, Shield, Mail } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About Luna Golf" subtitle="The story behind the UK's premier matchplay knockout platform" icon={Trophy} gradient="green" compact />
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Mission */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Our Mission</h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-4">
                Luna Golf exists to bring the thrill of competitive matchplay golf to every club golfer in the UK. We believe that knockout competitions create unforgettable moments — the drama of a sudden-death playoff, the satisfaction of progressing through regional rounds to a national final.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Our platform connects golfers across the country, enabling clubs to run professional-grade knockout events without the administrative burden. From automated draws to live scoring, we handle the logistics so players can focus on what matters: the golf.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 text-center">
                <p className="text-3xl font-bold text-green-700 dark:text-green-400">50+</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Partner Clubs</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 text-center">
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">1,000+</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Players</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 text-center">
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">12</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Regions</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 text-center">
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">£10k+</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Prize Pools</p>
              </div>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">Our Story</h2>
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-8">
            <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                Luna Golf was born from a simple observation: club golfers love competitive matchplay, but organising knockout competitions across multiple clubs is a logistical nightmare. Spreadsheets, WhatsApp groups, and phone calls dominated — leaving organisers burned out and players frustrated.
              </p>
              <p>
                We set out to build a platform that makes running knockout events as simple as clicking a button. From seeded draws using WHS handicaps, to automated fixture scheduling, live scoring, and league tables — everything a club needs to deliver a world-class competition experience.
              </p>
              <p>
                Starting with a handful of clubs in the South East, Luna Golf has grown to serve golfers across the UK. Our vision is simple: every club golfer should have access to meaningful, well-organised competitive golf — not just scratch players at championship events.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">What We Stand For</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Competition for All', desc: 'Every handicap level deserves meaningful competition. Our format levels the playing field through WHS-adjusted matchplay.' },
              { icon: Users, title: 'Community First', desc: 'Golf is better together. We connect players across clubs, creating friendships and rivalries that last beyond the 18th green.' },
              { icon: Heart, title: 'Club Support', desc: 'We exist to help clubs grow. Revenue sharing, member retention tools, and zero admin burden — we\'re partners, not landlords.' },
              { icon: Globe, title: 'National Reach', desc: 'Regional knockout stages feeding into a national final. One platform connecting every corner of British golf.' },
              { icon: Shield, title: 'Fair Play', desc: 'WHS handicap verification, result confirmation by both players, and transparent scoring. The game\'s integrity comes first.' },
              { icon: Trophy, title: 'Memorable Moments', desc: 'Every match is a story. Our live tracker, social feed, and stats create a record of your competitive journey.' },
            ].map((v, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition">
                <v.icon className="w-8 h-8 text-green-700 dark:text-green-400 mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-green-700 to-emerald-700 rounded-2xl p-10 text-center text-white">
          <h2 className="text-2xl font-extrabold mb-3">Ready to Compete?</h2>
          <p className="text-green-100 mb-6 max-w-lg mx-auto">Join the growing network of golfers and clubs making matchplay knockout the highlight of the season.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="bg-white text-green-800 font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition">Register as a Player</Link>
            <Link to="/contact" className="border-2 border-white/50 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition">Contact Us</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

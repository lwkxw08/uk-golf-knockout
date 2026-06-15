import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white text-lg">UK Golf Knockout</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">The UK's premier matchplay knockout platform. Compete, connect, and play with golfers across the country.</p>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">For Players</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/tournaments" className="text-sm hover:text-green-400 transition">Tournaments</Link>
              <Link to="/leaderboard" className="text-sm hover:text-green-400 transition">Leaderboard</Link>
              <Link to="/social" className="text-sm hover:text-green-400 transition">Social</Link>
              <Link to="/tee-times" className="text-sm hover:text-green-400 transition">Share a Round</Link>
              <Link to="/marketplace" className="text-sm hover:text-green-400 transition">Marketplace</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">For Clubs</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/register?role=club" className="text-sm hover:text-green-400 transition">Join the Network</Link>
              <Link to="/membership" className="text-sm hover:text-green-400 transition">Membership</Link>
              <Link to="/subscriptions" className="text-sm hover:text-green-400 transition">Club Subscriptions</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/terms" className="text-sm hover:text-green-400 transition">Terms of Service</Link>
              <Link to="/privacy" className="text-sm hover:text-green-400 transition">Privacy Policy</Link>
              <a href="mailto:support@ukgolfknockout.com" className="text-sm hover:text-green-400 transition">Contact Us</a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs">&copy; {new Date().getFullYear()} UK Golf Knockout Network. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/terms" className="hover:text-green-400 transition">Terms</Link>
            <span className="text-gray-700">•</span>
            <Link to="/privacy" className="hover:text-green-400 transition">Privacy</Link>
            <span className="text-gray-700">•</span>
            <a href="mailto:support@ukgolfknockout.com" className="hover:text-green-400 transition">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

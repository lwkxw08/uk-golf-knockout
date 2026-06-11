import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-white">UK Golf Knockout Network</span>
            </div>
            <p className="text-sm max-w-xs">The UK's knockout golf competition platform. Play, compete, and connect with golfers across the country.</p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <h4 className="text-white text-sm font-medium mb-2">Platform</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/tournaments" className="text-sm hover:text-green-400 transition">Tournaments</Link>
                <Link to="/leaderboard" className="text-sm hover:text-green-400 transition">Leaderboard</Link>
                <Link to="/marketplace" className="text-sm hover:text-green-400 transition">Marketplace</Link>
                <Link to="/membership" className="text-sm hover:text-green-400 transition">Membership</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white text-sm font-medium mb-2">Legal</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/terms" className="text-sm hover:text-green-400 transition">Terms of Service</Link>
                <Link to="/privacy" className="text-sm hover:text-green-400 transition">Privacy Policy</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white text-sm font-medium mb-2">Contact</h4>
              <div className="flex flex-col gap-1.5">
                <a href="mailto:support@ukgolfknockout.com" className="text-sm hover:text-green-400 transition">support@ukgolfknockout.com</a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-center">&copy; {new Date().getFullYear()} UK Golf Knockout Network. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

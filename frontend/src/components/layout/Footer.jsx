import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.svg" alt="Luna Golf" className="h-10" />
            </div>
            <p className="text-sm leading-relaxed max-w-xs">The UK's premier matchplay knockout platform. Compete, connect, and play with golfers across the country.</p>
            <p className="text-xs mt-3 text-gray-500">lunagolf.co.uk</p>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">For Players</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/tournaments" className="text-sm hover:text-green-400 transition">Tournaments</Link>
              <Link to="/leaderboard" className="text-sm hover:text-green-400 transition">Leaderboard</Link>
              <Link to="/social" className="text-sm hover:text-green-400 transition">Social</Link>
              <Link to="/tee-times" className="text-sm hover:text-green-400 transition">Share a Round</Link>
              <Link to="/marketplace" className="text-sm hover:text-green-400 transition">Marketplace</Link>
              <Link to="/membership" className="text-sm hover:text-green-400 transition">Membership</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">For Clubs</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/register?role=club" className="text-sm hover:text-green-400 transition">Join the Network</Link>
              <Link to="/subscriptions" className="text-sm hover:text-green-400 transition">Club Subscriptions</Link>
              <Link to="/how-it-works" className="text-sm hover:text-green-400 transition">How It Works</Link>
              <Link to="/contact" className="text-sm hover:text-green-400 transition">Partner With Us</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Company</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/about" className="text-sm hover:text-green-400 transition">About Us</Link>
              <Link to="/news" className="text-sm hover:text-green-400 transition">News & Blog</Link>
              <Link to="/faq" className="text-sm hover:text-green-400 transition">FAQ</Link>
              <Link to="/contact" className="text-sm hover:text-green-400 transition">Contact Us</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/terms" className="text-sm hover:text-green-400 transition">Terms of Service</Link>
              <Link to="/privacy" className="text-sm hover:text-green-400 transition">Privacy Policy</Link>
              <a href="mailto:hello@lunagolf.co.uk" className="text-sm hover:text-green-400 transition">hello@lunagolf.co.uk</a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs">&copy; {new Date().getFullYear()} Luna Golf. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/terms" className="hover:text-green-400 transition">Terms</Link>
            <span className="text-gray-700">•</span>
            <Link to="/privacy" className="hover:text-green-400 transition">Privacy</Link>
            <span className="text-gray-700">•</span>
            <Link to="/faq" className="hover:text-green-400 transition">FAQ</Link>
            <span className="text-gray-700">•</span>
            <a href="mailto:hello@lunagolf.co.uk" className="hover:text-green-400 transition">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

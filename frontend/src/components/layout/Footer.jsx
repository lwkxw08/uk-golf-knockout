import { Trophy } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold text-white">UK Golf Knockout Network</span>
          </div>
          <p className="text-sm">&copy; {new Date().getFullYear()} UK Golf Knockout Network. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

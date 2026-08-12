import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Search, X, User, MapPin, Trophy } from 'lucide-react';

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ players: [], clubs: [], tournaments: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults({ players: [], clubs: [], tournaments: [] }); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch { }
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const goTo = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const hasResults = results.players.length || results.clubs.length || results.tournaments.length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-white/70 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
        <Search className="w-4 h-4 text-white/60" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players, clubs, tournaments..."
          className="bg-transparent text-white placeholder-white/50 text-sm outline-none w-48 md:w-64"
        />
        <button onClick={() => { setOpen(false); setQuery(''); }} className="text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results dropdown */}
      {query.length >= 2 && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border max-h-96 overflow-y-auto z-50">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Searching...</div>
          )}
          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No results for "{query}"</div>
          )}

          {results.players.length > 0 && (
            <div className="border-b">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">Players</p>
              {results.players.map(p => (
                <button
                  key={p.id}
                  onClick={() => goTo(`/players/${p.id}/stats`)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:bg-gray-900 text-left"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold">
                    {p.firstName?.[0]}{p.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{p.homeClub?.name || 'No club'} {p.handicapIndex ? `• HI ${p.handicapIndex}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.clubs.length > 0 && (
            <div className="border-b">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">Clubs</p>
              {results.clubs.map(c => (
                <button
                  key={c.id}
                  onClick={() => goTo(`/clubs/${c.slug}`)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:bg-gray-900 text-left"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">{[c.city, c.county].filter(Boolean).join(', ')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.tournaments.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50">Tournaments</p>
              {results.tournaments.map(t => (
                <button
                  key={t.id}
                  onClick={() => goTo(`/tournaments/${t.id}`)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:bg-gray-900 text-left"
                >
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.status} • {t.formatType?.replace(/_/g, ' ')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

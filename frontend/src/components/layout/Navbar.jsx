import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Trophy className="w-7 h-7" />
            <span className="hidden sm:inline">UK Golf Knockout</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/tournaments" className="hover:text-green-200 transition">Tournaments</Link>
            <Link to="/rankings" className="hover:text-green-200 transition">Rankings</Link>
            <Link to="/clubs" className="hover:text-green-200 transition">Clubs</Link>

            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="hover:text-green-200 transition">Admin</Link>
                )}
                <Link to="/dashboard" className="hover:text-green-200 transition">Dashboard</Link>
                <button onClick={handleLogout} className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded transition">
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded transition">Login</Link>
                <Link to="/register" className="bg-white text-green-800 hover:bg-green-50 px-4 py-2 rounded font-medium transition">Register</Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/tournaments" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Tournaments</Link>
            <Link to="/rankings" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Rankings</Link>
            <Link to="/clubs" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Clubs</Link>
            {user ? (
              <>
                {user.role === 'ADMIN' && <Link to="/admin" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Admin</Link>}
                <Link to="/dashboard" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block w-full text-left py-2 hover:text-green-200">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

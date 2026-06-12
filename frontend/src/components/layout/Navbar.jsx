import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import SearchBar from './SearchBar';

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
          <div className="hidden md:flex items-center gap-5">
            <Link to="/tournaments" className="hover:text-green-200 transition text-sm">Tournaments</Link>
            <Link to="/leaderboard" className="hover:text-green-200 transition text-sm">Leaderboard</Link>
            <Link to="/feed" className="hover:text-green-200 transition text-sm">Feed</Link>
            <Link to="/marketplace" className="hover:text-green-200 transition text-sm">Marketplace</Link>
            <Link to="/membership" className="hover:text-green-200 transition text-sm">Membership</Link>

            <SearchBar />

            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <div className="relative group">
                    <button className="hover:text-green-200 transition text-sm py-5">Admin</button>
                    <div className="absolute right-0 top-full bg-white text-gray-800 rounded-lg shadow-lg py-2 w-48 hidden group-hover:block z-50">
                      <Link to="/admin" className="block px-4 py-2 hover:bg-gray-100 text-sm">Dashboard</Link>
                      <Link to="/admin/tournaments/new" className="block px-4 py-2 hover:bg-gray-100 text-sm">New Tournament</Link>
                      <Link to="/admin/sponsors" className="block px-4 py-2 hover:bg-gray-100 text-sm">Sponsors</Link>
                      <Link to="/admin/pricing" className="block px-4 py-2 hover:bg-gray-100 text-sm">Pricing</Link>
                      <Link to="/admin/clubs" className="block px-4 py-2 hover:bg-gray-100 text-sm">Clubs</Link>
                      <Link to="/admin/users" className="block px-4 py-2 hover:bg-gray-100 text-sm">Users</Link>
                      <Link to="/admin/settings" className="block px-4 py-2 hover:bg-gray-100 text-sm">Settings</Link>
                      <Link to="/club-portal" className="block px-4 py-2 hover:bg-gray-100 text-sm">Club Portal</Link>
                    </div>
                  </div>
                )}
                {user.role === 'CLUB_MANAGER' && (
                  <Link to="/club-portal" className="hover:text-green-200 transition text-sm">Club Portal</Link>
                )}
                {user.role !== 'ADMIN' && user.role !== 'CLUB_MANAGER' && (
                  <Link to="/dashboard" className="hover:text-green-200 transition text-sm">Dashboard</Link>
                )}

                {/* Profile dropdown */}
                <div className="relative group">
                  <button className="bg-green-700 hover:bg-green-600 p-2 rounded-full transition my-3">
                    <User className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 top-full bg-white text-gray-800 rounded-lg shadow-lg py-2 w-44 hidden group-hover:block z-50">
                    <p className="px-4 py-1 text-xs text-gray-500 truncate">{user.email}</p>
                    <hr className="my-1" />
                    {user.role === 'PLAYER' && (
                      <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100 text-sm">My Profile</Link>
                    )}
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600">
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded transition text-sm">Login</Link>
                <Link to="/register" className="bg-white text-green-800 hover:bg-green-50 px-4 py-2 rounded font-medium transition text-sm">Register</Link>
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
            <Link to="/leaderboard" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
            <Link to="/feed" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Feed</Link>
            <Link to="/marketplace" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Marketplace</Link>
            <Link to="/membership" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Membership</Link>
            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <>
                    <Link to="/admin" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Admin Dashboard</Link>
                    <Link to="/admin/sponsors" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Sponsors</Link>
                    <Link to="/admin/pricing" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Pricing</Link>
                    <Link to="/admin/settings" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Settings</Link>
                    <Link to="/club-portal" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Club Portal</Link>
                  </>
                )}
                {user.role === 'CLUB_MANAGER' && (
                  <Link to="/club-portal" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>Club Portal</Link>
                )}
                {user.role !== 'ADMIN' && user.role !== 'CLUB_MANAGER' && (
                  <Link to="/dashboard" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>My Dashboard</Link>
                )}
                {user.role === 'PLAYER' && (
                  <Link to="/profile" className="block py-2 hover:text-green-200" onClick={() => setMenuOpen(false)}>My Profile</Link>
                )}
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

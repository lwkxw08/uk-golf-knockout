import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Trophy, Menu, X, User, Moon, Sun, ChevronDown, LogOut, Settings, Shield, Users, CreditCard, Megaphone, BarChart3, FileText, ClipboardList } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import SearchBar from './SearchBar';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const adminRef = useRef(null);
  const profileRef = useRef(null);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navBg = scrolled || menuOpen
    ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg border-b border-gray-200/50 dark:border-gray-700/50'
    : isHome
      ? 'bg-transparent dark:bg-gray-900'
      : 'bg-green-900 dark:bg-gray-900';

  const textColor = scrolled || menuOpen
    ? 'text-gray-700 dark:text-gray-200'
    : 'text-white';

  const linkHover = scrolled
    ? 'hover:text-green-700 dark:hover:text-green-400'
    : 'hover:text-green-200';

  const NavLink = ({ to, children }) => (
    <Link to={to} className={`${textColor} ${linkHover} transition text-sm font-medium px-1`}>{children}</Link>
  );

  const adminLinks = [
    { to: '/admin', icon: BarChart3, label: 'Dashboard' },
    { to: '/admin/tournaments/new', icon: Trophy, label: 'New Tournament' },
    { to: '/admin/sponsors', icon: Megaphone, label: 'Sponsors' },
    { to: '/admin/pricing', icon: CreditCard, label: 'Pricing' },
    { to: '/admin/clubs', icon: Shield, label: 'Clubs' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/memberships', icon: ClipboardList, label: 'Memberships' },
    { to: '/admin/audit-log', icon: FileText, label: 'Audit Log' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
    { to: '/club-portal', icon: Shield, label: 'Club Portal' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className={`flex items-center gap-2 font-bold text-lg ${textColor} transition`}>
            <img src={!scrolled && !dark ? '/logo-white.svg' : '/logo.svg'} alt="Luna Golf" className="h-12 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-6">
            <NavLink to="/tournaments">Tournaments</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>
            <NavLink to="/social">Social</NavLink>
            <NavLink to="/tee-times">Share a Round</NavLink>
            <NavLink to="/marketplace">Marketplace</NavLink>

            <SearchBar />

            <button onClick={toggle} className={`${textColor} ${linkHover} transition p-2 rounded-lg`} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <div ref={adminRef} className="relative">
                    <button
                      onClick={() => { setAdminOpen(!adminOpen); setProfileOpen(false); }}
                      className={`flex items-center gap-1 ${textColor} ${linkHover} transition text-sm font-medium px-1`}
                    >
                      Admin <ChevronDown className={`w-3.5 h-3.5 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {adminOpen && (
                      <div className="absolute right-0 mt-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 w-52 animate-in fade-in slide-in-from-top-2">
                        {adminLinks.map(({ to, icon: Icon, label }) => (
                          <Link key={to} to={to} onClick={() => setAdminOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 transition">
                            <Icon className="w-4 h-4 text-gray-400" /> {label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {user.role === 'CLUB_MANAGER' && <NavLink to="/club-portal">Club Portal</NavLink>}
                {user.role !== 'ADMIN' && user.role !== 'CLUB_MANAGER' && <NavLink to="/dashboard">Dashboard</NavLink>}

                {/* Profile dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => { setProfileOpen(!profileOpen); setAdminOpen(false); }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition ${scrolled ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-white/20 hover:bg-white/30 backdrop-blur text-white'}`}
                  >
                    <User className="w-4 h-4" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 w-48 animate-in fade-in slide-in-from-top-2">
                      <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 truncate border-b dark:border-gray-700">{user.email}</p>
                      {user.role === 'PLAYER' && (
                        <Link to="/profile" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 transition">
                          <User className="w-4 h-4 text-gray-400" /> My Profile
                        </Link>
                      )}
                      <button onClick={() => { handleLogout(); setProfileOpen(false); }}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 transition">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className={`px-4 py-2 rounded-lg text-sm font-medium transition ${scrolled ? 'text-green-700 hover:bg-green-50' : 'text-white hover:bg-white/10'}`}>Login</Link>
                <Link to="/register" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm">Register</Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={toggle} className={`${textColor} p-2 rounded-lg transition`}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className={`${textColor} p-1 transition`}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden pb-6 pt-2 space-y-1 border-t border-gray-200/20 dark:border-gray-700/50 mt-2">
            {[
              { to: '/tournaments', label: 'Tournaments' },
              { to: '/leaderboard', label: 'Leaderboard' },
              { to: '/social', label: 'Social' },
              { to: '/tee-times', label: 'Share a Round' },
              { to: '/marketplace', label: 'Marketplace' },
              { to: '/membership', label: 'Membership' },
            ].map(({ to, label }) => (
              <Link key={to} to={to} className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-800 transition">{label}</Link>
            ))}
            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">Admin</p>
                    {adminLinks.map(({ to, label }) => (
                      <Link key={to} to={to} className="block py-2 px-3 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-800 transition">{label}</Link>
                    ))}
                  </div>
                )}
                {user.role === 'CLUB_MANAGER' && (
                  <Link to="/club-portal" className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-800 transition">Club Portal</Link>
                )}
                {user.role !== 'ADMIN' && user.role !== 'CLUB_MANAGER' && (
                  <Link to="/dashboard" className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-800 transition">My Dashboard</Link>
                )}
                {user.role === 'PLAYER' && (
                  <Link to="/profile" className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-800 transition">My Profile</Link>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <button onClick={handleLogout} className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 transition">Logout</button>
                </div>
              </>
            ) : (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2 flex gap-2 px-3">
                <Link to="/login" className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium border border-green-700 text-green-700 hover:bg-green-50 transition">Login</Link>
                <Link to="/register" className="flex-1 text-center py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition">Register</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2316a34a' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img src="/logo.svg" alt="Luna Golf" className="h-20 w-auto mx-auto dark:hidden" />
            <img src="/logo-white.svg" alt="Luna Golf" className="h-20 w-auto mx-auto hidden dark:block" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Sign In</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back to UK Golf Knockout</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl border dark:border-gray-700 p-8 space-y-5">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-green-700 dark:text-green-400 hover:underline">Forgot password?</Link>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 shadow-lg shadow-green-700/20"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account? <Link to="/register" className="text-green-700 dark:text-green-400 font-semibold hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

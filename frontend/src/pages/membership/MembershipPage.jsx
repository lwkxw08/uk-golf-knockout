import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Crown, Check, Star } from 'lucide-react';

export default function MembershipPage() {
  const { user } = useAuth();
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/memberships/me').then(setMembership).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const result = await api.post('/memberships/subscribe', { tier: 'standard' });
      if (result.requiresPayment) {
        alert('Stripe payment would be processed here. In dev mode, membership was created directly.');
      }
      const updated = await api.get('/memberships/me');
      setMembership(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your membership? Access continues until the current period ends.')) return;
    try {
      await api.post('/memberships/cancel');
      const updated = await api.get('/memberships/me');
      setMembership(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRenew = async () => {
    setSubscribing(true);
    try {
      const result = await api.post('/memberships/renew');
      if (result.requiresPayment) {
        alert('Stripe payment would be processed here. In dev mode, membership was renewed directly.');
      }
      const updated = await api.get('/memberships/me');
      setMembership(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubscribing(false);
    }
  };

  const features = [
    'National competition eligibility',
    'Official rankings & handicap tracking',
    'Regional & national progression',
    'Priority entry to tournaments',
    'Prize eligibility',
    'Match scheduling & notifications',
    'Digital scorecard storage',
    'Performance statistics',
  ];

  const daysUntilExpiry = membership?.membershipExpiry ? Math.ceil((new Date(membership.membershipExpiry) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Player Membership</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Join the UK Golf Knockout Network and compete nationally.</p>
      </div>

      {/* Expired — renew prompt */}
      {isExpired && membership?.hasMembership === false && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8 text-center">
          <Crown className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="font-bold text-red-800 dark:text-red-300 text-lg">Membership Expired</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">Your membership expired on {new Date(membership.membershipExpiry).toLocaleDateString('en-GB')}. Renew to keep competing.</p>
          <button onClick={handleRenew} disabled={subscribing}
            className="mt-4 bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 font-medium disabled:opacity-50">
            {subscribing ? 'Processing...' : 'Renew Now'}
          </button>
        </div>
      )}

      {/* Active membership */}
      {membership?.hasMembership && (
        <div className={`rounded-xl p-6 mb-8 text-center border ${isExpiringSoon ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'}`}>
          <Crown className={`w-8 h-8 mx-auto mb-2 ${isExpiringSoon ? 'text-amber-600' : 'text-green-700'}`} />
          <p className={`font-bold text-lg ${isExpiringSoon ? 'text-amber-800 dark:text-amber-300' : 'text-green-800 dark:text-green-300'}`}>
            {isExpiringSoon ? 'Membership Expiring Soon' : 'Active Member'}
          </p>
          <p className={`text-sm mt-1 ${isExpiringSoon ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
            {isExpiringSoon
              ? `Expires in ${daysUntilExpiry} days (${new Date(membership.membershipExpiry).toLocaleDateString('en-GB')})`
              : `Expires: ${membership.membershipExpiry ? new Date(membership.membershipExpiry).toLocaleDateString('en-GB') : 'N/A'}`}
          </p>
          {isExpiringSoon && (
            <button onClick={handleRenew} disabled={subscribing}
              className="mt-3 bg-green-700 text-white px-5 py-2 rounded-lg hover:bg-green-800 text-sm font-medium disabled:opacity-50">
              {subscribing ? 'Processing...' : 'Renew Early'}
            </button>
          )}
          <button onClick={handleCancel} className="mt-4 block mx-auto text-sm text-red-600 hover:underline">Cancel Membership</button>
        </div>
      )}

      {/* Pricing card */}
      <div className="bg-white border-2 border-green-200 rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-8 text-center">
          <p className="text-green-200 text-sm font-medium">ANNUAL MEMBERSHIP</p>
          <p className="text-5xl font-bold mt-2">&pound;39</p>
          <p className="text-green-200 mt-1">per year</p>
        </div>
        <div className="p-8">
          <ul className="space-y-3 mb-8">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {!membership?.hasMembership && user && (
            <button onClick={handleSubscribe} disabled={subscribing}
              className="w-full bg-green-700 hover:bg-green-800 text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50">
              {subscribing ? 'Processing...' : 'Subscribe Now — £39/year'}
            </button>
          )}
          {!user && (
            <a href="/register" className="block w-full text-center bg-green-700 hover:bg-green-800 text-white py-4 rounded-xl font-bold text-lg transition">
              Register to Subscribe
            </a>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">Secure payment via Stripe. Cancel anytime.</p>
    </div>
  );
}

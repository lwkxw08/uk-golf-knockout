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

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-gray-900">Player Membership</h1>
        <p className="text-gray-600 mt-2">Join the UK Golf Knockout Network and compete nationally.</p>
      </div>

      {/* Active membership */}
      {membership?.hasMembership && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 text-center">
          <Crown className="w-8 h-8 text-green-700 mx-auto mb-2" />
          <p className="font-bold text-green-800 text-lg">Active Member</p>
          <p className="text-sm text-green-700 mt-1">
            Expires: {membership.membershipExpiry ? new Date(membership.membershipExpiry).toLocaleDateString('en-GB') : 'N/A'}
          </p>
          <button onClick={handleCancel} className="mt-4 text-sm text-red-600 hover:underline">Cancel Membership</button>
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

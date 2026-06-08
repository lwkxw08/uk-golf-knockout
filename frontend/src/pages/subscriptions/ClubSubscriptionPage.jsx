import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Check, Star, Crown } from 'lucide-react';

export default function ClubSubscriptionPage() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/subscriptions/tiers'),
      user ? api.get('/subscriptions/my-subscription').catch(() => ({ subscription: null })) : Promise.resolve({ subscription: null }),
    ]).then(([t, s]) => {
      setTiers(t);
      setCurrentSub(s.subscription);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const handleSubscribe = async (tierId) => {
    try {
      const result = await api.post('/subscriptions/subscribe', { tierId });
      if (result.requiresPayment) {
        alert('Stripe payment would be processed here.');
      }
      const updated = await api.get('/subscriptions/my-subscription');
      setCurrentSub(updated.subscription);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <Building2 className="w-12 h-12 text-green-700 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-gray-900">Club Subscriptions</h1>
        <p className="text-gray-600 mt-2">Choose the plan that's right for your club.</p>
      </div>

      {currentSub && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 text-center">
          <Crown className="w-8 h-8 text-green-700 mx-auto mb-2" />
          <p className="font-bold text-green-800">Active: {currentSub.tier?.name}</p>
          <p className="text-sm text-green-700 mt-1">Expires: {new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-GB')}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier, i) => (
          <div key={tier.id} className={`bg-white rounded-2xl overflow-hidden border-2 transition ${i === 1 ? 'border-green-500 shadow-lg scale-105' : 'border-gray-200'}`}>
            {i === 1 && <div className="bg-green-700 text-white text-center py-1.5 text-xs font-bold">MOST POPULAR</div>}
            <div className="p-8">
              <h3 className="text-xl font-bold">{tier.name}</h3>
              <p className="text-4xl font-bold text-green-700 mt-4">&pound;{(tier.amountPence / 100).toFixed(0)}<span className="text-sm font-normal text-gray-500">/year</span></p>
              <ul className="mt-6 space-y-3">
                {(tier.features || []).map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {user && !currentSub && (
                <button onClick={() => handleSubscribe(tier.id)}
                  className={`w-full mt-6 py-3 rounded-lg font-bold transition ${
                    i === 1 ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}>
                  Subscribe
                </button>
              )}
              {!user && (
                <a href="/register?role=club" className={`block w-full text-center mt-6 py-3 rounded-lg font-bold transition ${
                  i === 1 ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}>
                  Register Club
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="font-medium">No subscription tiers configured yet</p>
          <p className="text-sm mt-1">Contact the platform administrator.</p>
        </div>
      )}
    </div>
  );
}

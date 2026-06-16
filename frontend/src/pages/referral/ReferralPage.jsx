import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import { Gift, Copy, Check, Users, PoundSterling, Share2 } from 'lucide-react';

export default function ReferralPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/referrals/my')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.shareUrl || data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = () => {
    if (!data || !navigator.share) return;
    navigator.share({
      title: 'Join UK Golf Knockout',
      text: `Join me on UK Golf Knockout! Use my referral code ${data.referralCode} and we both get \u00a35 off our next entry fee.`,
      url: data.shareUrl,
    }).catch(() => {});
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load referral data</div>;

  return (
    <div>
      <PageHeader title="Refer a Friend" subtitle="Invite friends to UK Golf Knockout. You both get \u00a35 off your next entry fee!" icon={Gift} gradient="green" compact />
      <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Referral Code Card */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white mb-6">
        <p className="text-sm opacity-90 mb-2">Your referral code</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold tracking-wider flex-1">{data.referralCode}</span>
          <button onClick={copyCode}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs opacity-75 mt-3 truncate">{data.shareUrl}</p>
        <div className="flex gap-2 mt-4">
          <button onClick={copyCode}
            className="flex-1 bg-white text-green-700 font-medium py-2 rounded-lg hover:bg-green-50 transition text-sm">
            Copy Link
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={shareNative}
              className="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg transition text-sm flex items-center justify-center gap-1">
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border text-center">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.totalReferred}</p>
          <p className="text-xs text-gray-500">Referred</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border text-center">
          <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.completed}</p>
          <p className="text-xs text-gray-500">Redeemed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border text-center">
          <PoundSterling className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">\u00a3{(data.stats.totalEarnedPence / 100).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Earned</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">How it works</h2>
        <div className="space-y-4">
          {[
            { step: '1', text: 'Share your unique referral code or link with friends' },
            { step: '2', text: 'They register using your code and join a tournament' },
            { step: '3', text: 'You both receive \u00a35 off your next tournament entry fee' },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {item.step}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm pt-1">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral History */}
      {data.referrals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold text-gray-900 mb-4">Referral History</h2>
          <div className="space-y-3">
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{r.referredPlayer}</p>
                  <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  r.status === 'redeemed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  r.status === 'registered' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {r.status === 'redeemed' ? `\u00a3${(r.discountPence / 100).toFixed(2)} earned` : r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

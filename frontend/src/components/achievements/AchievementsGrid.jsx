import { useState, useEffect } from 'react';
import { Award, Lock, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

const TIER_STYLES = {
  BRONZE: 'from-amber-600 to-amber-800 ring-amber-500/40',
  SILVER: 'from-gray-400 to-gray-600 ring-gray-400/40',
  GOLD: 'from-yellow-400 to-yellow-600 ring-yellow-400/40',
};

/**
 * @param {string} [playerId] omit to show the signed-in player's own badges,
 *   including the ones still locked
 */
export default function AchievementsGrid({ playerId, compact }) {
  const [state, setState] = useState({ loading: true, achievements: [], earnedCount: 0, totalCount: 0 });

  useEffect(() => {
    const path = playerId ? `/achievements/player/${playerId}` : '/achievements/me';
    api.get(path)
      .then((data) => setState({
        loading: false,
        achievements: data.achievements || [],
        earnedCount: data.earnedCount ?? (data.achievements || []).length,
        totalCount: data.totalCount ?? (data.achievements || []).length,
      }))
      .catch(() => setState({ loading: false, achievements: [], earnedCount: 0, totalCount: 0 }));
  }, [playerId]);

  if (state.loading) {
    return <p className="text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading badges…</p>;
  }

  const shown = compact ? state.achievements.filter((a) => a.earned !== false).slice(0, 8) : state.achievements;

  if (shown.length === 0) {
    return <p className="text-sm text-gray-500">No badges yet — play a match to get started.</p>;
  }

  return (
    <div>
      {!playerId && (
        <p className="text-xs text-gray-500 mb-3">{state.earnedCount} of {state.totalCount} unlocked</p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {shown.map((a) => {
          const earned = a.earned !== false;
          return (
            <div
              key={a.id}
              title={`${a.name} — ${a.description}${a.awardedAt ? ` (${new Date(a.awardedAt).toLocaleDateString('en-GB')})` : ''}`}
              className={`rounded-xl p-3 text-center border ${earned ? 'border-transparent bg-gradient-to-br text-white ring-2 ' + TIER_STYLES[a.tier] : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400'}`}
            >
              <div className="flex justify-center mb-1.5">
                {earned ? <Award className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
              </div>
              <p className="text-[11px] font-semibold leading-tight">{a.name}</p>
              {earned && a.awardedAt && (
                <p className="text-[10px] opacity-80 mt-1">{new Date(a.awardedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

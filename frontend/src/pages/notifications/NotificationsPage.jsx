import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Trash2, Mail, Smartphone, Loader2, Check } from 'lucide-react';
import { api } from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';
import { timeAgo } from '../../components/notifications/NotificationBell';
import PageHeader from '../../components/layout/PageHeader';

const TYPE_LABELS = {
  DRAW_PUBLISHED: 'Draws and fixtures',
  DRAW_SCHEDULED: 'Live draw reminders',
  MATCH_PROPOSAL: 'Proposed match times',
  MATCH_SCHEDULED: 'Confirmed match times',
  MATCH_REMINDER: 'Match reminders',
  RESULT_SUBMITTED: 'Results awaiting your sign-off',
  RESULT_CONFIRMED: 'Results confirmed',
  RESULT_DISPUTED: 'Disputed results',
  DEADLINE_WARNING: 'Deadline warnings',
  WALKOVER_APPLIED: 'Walkovers',
  STAGE_PROMOTION: 'Stage progression',
  ACHIEVEMENT_UNLOCKED: 'Achievements',
  ANNOUNCEMENT: 'Announcements',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove, reload, pushEnabled, enablePush, disablePush } = useNotifications();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/notifications/preferences').then(setPrefs).catch(() => setPrefs({ email: true, push: true, mutedTypes: [] }));
  }, []);

  const savePrefs = async (next) => {
    setPrefs(next);
    setSaving(true);
    try {
      await api.put('/notifications/preferences', next);
    } finally {
      setSaving(false);
    }
  };

  const toggleType = (type) => {
    const muted = prefs.mutedTypes || [];
    const next = muted.includes(type) ? muted.filter((t) => t !== type) : [...muted, type];
    savePrefs({ ...prefs, mutedTypes: next });
  };

  const togglePush = async () => {
    setPushError('');
    setPushBusy(true);
    try {
      if (pushEnabled) await disablePush();
      else await enablePush();
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  };

  const openNotification = async (n) => {
    if (!n.isRead) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are up to date'}
        icon={Bell}
        compact
        breadcrumbs={[{ label: 'Notifications' }]}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
            <p className="font-semibold text-sm">Recent</p>
            <div className="flex gap-3">
              <button onClick={reload} className="text-xs text-gray-500 hover:underline">Refresh</button>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-green-700 dark:text-green-400 hover:underline">Mark all read</button>
              )}
            </div>
          </div>

          {loading && notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Nothing yet. You will be notified when you are drawn, when an opponent proposes a time, and when a result needs your sign-off.
            </p>
          ) : notifications.map((n) => (
            <div key={n.id} className={`flex gap-3 px-4 py-3 border-b last:border-0 dark:border-gray-700 ${n.isRead ? '' : 'bg-green-50/60 dark:bg-green-900/10'}`}>
              <button onClick={() => openNotification(n)} className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{n.body}</p>
                <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
              </button>
              <button onClick={() => remove(n.id)} className="text-gray-300 hover:text-red-500 transition self-start" aria-label="Delete notification">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="font-semibold text-sm mb-3">Delivery</p>

            <button
              onClick={togglePush}
              disabled={pushBusy}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition ${pushEnabled ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
              <span className="flex items-center gap-2">
                {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                Browser push
              </span>
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : pushEnabled && <Check className="w-4 h-4" />}
            </button>
            {pushError && <p className="text-xs text-red-500 mt-2">{pushError}</p>}
            <p className="text-[11px] text-gray-400 mt-2">
              Push works on this device only. Enable it on your phone too for on-course alerts.
            </p>

            {prefs && (
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.email} onChange={(e) => savePrefs({ ...prefs, email: e.target.checked })} className="rounded" />
                  <Mail className="w-4 h-4 text-gray-400" /> Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.push} onChange={(e) => savePrefs({ ...prefs, push: e.target.checked })} className="rounded" />
                  <Smartphone className="w-4 h-4 text-gray-400" /> Send pushes to my devices
                </label>
              </div>
            )}
          </div>

          {prefs && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="font-semibold text-sm mb-1">What you hear about</p>
              <p className="text-[11px] text-gray-400 mb-3">Untick to mute a category{saving ? ' — saving…' : ''}</p>
              <div className="space-y-1.5">
                {Object.entries(TYPE_LABELS).map(([type, label]) => (
                  <label key={type} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!(prefs.mutedTypes || []).includes(type)}
                      onChange={() => toggleType(type)}
                      className="rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

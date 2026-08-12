import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, Trophy, Award, AlertTriangle, CheckCircle2, Megaphone, Swords } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

const ICONS = {
  DRAW_PUBLISHED: Swords,
  DRAW_SCHEDULED: CalendarClock,
  MATCH_PROPOSAL: CalendarClock,
  MATCH_SCHEDULED: CalendarClock,
  MATCH_REMINDER: CalendarClock,
  RESULT_SUBMITTED: CheckCircle2,
  RESULT_CONFIRMED: CheckCircle2,
  RESULT_DISPUTED: AlertTriangle,
  DEADLINE_WARNING: AlertTriangle,
  WALKOVER_APPLIED: AlertTriangle,
  STAGE_PROMOTION: Trophy,
  ACHIEVEMENT_UNLOCKED: Award,
  ANNOUNCEMENT: Megaphone,
};

const TONE = {
  RESULT_DISPUTED: 'text-red-500',
  DEADLINE_WARNING: 'text-amber-500',
  WALKOVER_APPLIED: 'text-amber-500',
  ACHIEVEMENT_UNLOCKED: 'text-yellow-500',
  STAGE_PROMOTION: 'text-green-600',
};

export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NotificationBell({ textColor = 'text-white' }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleClick = async (n) => {
    setOpen(false);
    if (!n.isRead) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg transition ${textColor} hover:opacity-80`}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-green-700 dark:text-green-400 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Nothing yet. Draws, match times and results will appear here.
              </p>
            ) : notifications.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b last:border-0 dark:border-gray-700 transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${n.isRead ? '' : 'bg-green-50/60 dark:bg-green-900/10'}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${TONE[n.type] || 'text-gray-400'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-300 mt-0.5">{n.body}</span>
                    <span className="block text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />}
                </button>
              );
            })}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-sm font-medium text-green-700 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-b-xl border-t dark:border-gray-700"
          >
            All notifications and settings
          </Link>
        </div>
      )}
    </div>
  );
}

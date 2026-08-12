import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, Sunrise, Sun, Sunset, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../../components/layout/PageHeader';
import MatchScheduler from '../../components/scheduling/MatchScheduler';

const SLOTS = [
  { key: 'MORNING', label: 'Morning', icon: Sunrise },
  { key: 'AFTERNOON', label: 'Afternoon', icon: Sun },
  { key: 'EVENING', label: 'Evening', icon: Sunset },
];

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startOffset }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(new Date(year, month, d));
  return cells;
}

export default function AvailabilityPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState({}); // { '2026-08-20': ['MORNING'] }
  const [dirty, setDirty] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [matches, setMatches] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = isoDate(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
      const to = isoDate(new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0));
      const [availability, myMatches] = await Promise.all([
        api.get(`/availability/me?from=${from}&to=${to}`),
        api.get('/players/me/matches').catch(() => []),
      ]);

      const map = {};
      for (const slot of availability.availability) {
        if (!map[slot.date]) map[slot.date] = [];
        map[slot.date].push(slot.slot);
      }
      setSelected(map);
      setDirty(new Set());

      setMatches((Array.isArray(myMatches) ? myMatches : [])
        .filter((m) => ['PENDING', 'SCHEDULED'].includes(m.status) && m.playerA && m.playerB));
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => { load(); }, [load]);

  const toggle = (date, slot) => {
    const key = isoDate(date);
    setSelected((prev) => {
      const current = prev[key] || [];
      const next = current.includes(slot) ? current.filter((s) => s !== slot) : [...current, slot];
      return { ...prev, [key]: next };
    });
    setDirty((prev) => new Set(prev).add(key));
  };

  const save = async () => {
    if (dirty.size === 0) return;
    setSaving(true);
    try {
      await api.put('/availability/me', {
        dates: [...dirty].map((date) => ({ date, slots: selected[date] || [] })),
      });
      setDirty(new Set());
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const slotCount = Object.values(selected).reduce((sum, slots) => sum + slots.length, 0);

  return (
    <div>
      <PageHeader
        title="My availability"
        subtitle="Mark when you can play and we will find the slots you and your opponent share"
        icon={CalendarClock}
        compact
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Availability' }]}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-semibold w-40 text-center">{monthLabel}</p>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{slotCount} slots marked</span>
              <button
                onClick={save}
                disabled={dirty.size === 0 || saving}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {dirty.size > 0 ? `Save ${dirty.size} day${dirty.size > 1 ? 's' : ''}` : savedAt ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading your availability…</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 md:gap-2 text-[11px] font-semibold text-gray-400 uppercase mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {cells.map((date, i) => {
                  if (!date) return <div key={`pad-${i}`} />;
                  const key = isoDate(date);
                  const slots = selected[key] || [];
                  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  return (
                    <div key={key} className={`rounded-lg border p-1.5 ${isPast ? 'opacity-40' : ''} ${slots.length ? 'border-green-400 bg-green-50/60 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">{date.getDate()}</p>
                      <div className="flex flex-col gap-0.5">
                        {SLOTS.map(({ key: slotKey, icon: Icon, label }) => (
                          <button
                            key={slotKey}
                            disabled={isPast}
                            onClick={() => toggle(date, slotKey)}
                            title={label}
                            className={`flex items-center justify-center py-1 rounded transition ${slots.includes(slotKey) ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                          >
                            <Icon className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-[11px] text-gray-500">
                {SLOTS.map(({ key, icon: Icon, label }) => (
                  <span key={key} className="flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <h2 className="font-bold text-lg mb-3">Fixtures to arrange</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              No fixtures waiting to be arranged. New ones appear here as soon as a draw is made.
            </p>
          ) : (
            <div className="space-y-4">
              {matches.map((m) => <MatchScheduler key={m.id} match={m} onScheduled={load} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

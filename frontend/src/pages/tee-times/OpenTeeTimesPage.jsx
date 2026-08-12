import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, MapPin, Users, MessageCircle, Check, X, Plus, Calendar, PoundSterling } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function OpenTeeTimesPage() {
  const { user } = useAuth();
  const [teeTimes, setTeeTimes] = useState([]);
  const [myTeeTimes, setMyTeeTimes] = useState([]);
  const [tab, setTab] = useState('browse');
  const [showCreate, setShowCreate] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [form, setForm] = useState({ clubId: '', courseName: '', teeTime: '', spotsAvailable: 1, greenFeePence: '', notes: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadTeeTimes();
    if (user) loadMyTeeTimes();
    loadClubs();
  }, [user]);

  const loadTeeTimes = async () => {
    try { const data = await api.get('/social/tee-times'); setTeeTimes(data.teeTimes || []); } catch {}
  };

  const loadMyTeeTimes = async () => {
    try { const data = await api.get('/social/tee-times/mine'); setMyTeeTimes(data.teeTimes || []); } catch {}
  };

  const loadClubs = async () => {
    try { const data = await api.get('/clubs'); setClubs(data.clubs || data || []); } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const body = {
        teeTime: new Date(form.teeTime).toISOString(),
        spotsAvailable: parseInt(form.spotsAvailable),
        notes: form.notes || undefined,
      };
      if (form.clubId) body.clubId = form.clubId;
      if (form.courseName) body.courseName = form.courseName;
      if (form.greenFeePence) body.greenFeePence = parseInt(form.greenFeePence) * 100;

      await api.post('/social/tee-times', body);
      setShowCreate(false);
      setForm({ clubId: '', courseName: '', teeTime: '', spotsAvailable: 1, greenFeePence: '', notes: '' });
      setMsg('Tee time posted!');
      loadTeeTimes();
      loadMyTeeTimes();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleInterest = async (id) => {
    try {
      await api.post(`/social/tee-times/${id}/interest`, { message: 'I\'d love to join!' });
      setMsg('Interest sent!');
      loadTeeTimes();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message || 'Failed');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleAccept = async (teeTimeId, interestId) => {
    try {
      await api.post(`/social/tee-times/${teeTimeId}/accept/${interestId}`);
      setMsg('Player accepted!');
      loadMyTeeTimes();
      loadTeeTimes();
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to accept'); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this tee time?')) return;
    try {
      await api.post(`/social/tee-times/${id}/cancel`);
      loadMyTeeTimes();
      loadTeeTimes();
    } catch {}
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <PageHeader title="Share a Round" subtitle="Find playing partners and post open tee times" icon={Calendar} gradient="teal" compact />
      <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Post a spare spot in your group or find someone to play with</p>
        </div>
        {user && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 text-sm font-medium">
            <Plus className="w-4 h-4" /> Post Tee Time
          </button>
        )}
      </div>

      {msg && <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Failed') ? 'bg-red-50 dark:bg-red-900/30 text-red-700' : 'bg-green-50 dark:bg-green-900/30 text-green-700'}`}>{msg}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Post an Open Tee Time</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                <select value={form.clubId} onChange={(e) => setForm({ ...form, clubId: e.target.value })} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Select a club...</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="text" placeholder="Or type course name" value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm mt-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tee Time</label>
                <input type="datetime-local" required value={form.teeTime} onChange={(e) => setForm({ ...form, teeTime: e.target.value })} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spots Available</label>
                  <select value={form.spotsAvailable} onChange={(e) => setForm({ ...form, spotsAvailable: e.target.value })} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                    <option value="1">1 spot</option>
                    <option value="2">2 spots</option>
                    <option value="3">3 spots</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Green Fee (£)</label>
                  <input type="number" placeholder="e.g. 35" value={form.greenFeePence} onChange={(e) => setForm({ ...form, greenFeePence: e.target.value })} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea placeholder="Any info about the round — e.g. '3-ball looking for a 4th, social round, all abilities welcome'" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium text-sm">Post Tee Time</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b dark:border-gray-700">
        <button onClick={() => setTab('browse')} className={`pb-2 px-1 text-sm font-medium ${tab === 'browse' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500'}`}>Browse Open Rounds</button>
        {user && <button onClick={() => setTab('mine')} className={`pb-2 px-1 text-sm font-medium ${tab === 'mine' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500'}`}>My Tee Times ({myTeeTimes.length})</button>}
      </div>

      {/* Browse Tab */}
      {tab === 'browse' && (
        <div className="space-y-4">
          {teeTimes.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-12">No open tee times right now. Be the first to post one!</p>}
          {teeTimes.map(tt => (
            <div key={tt.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-bold text-green-700 dark:text-green-300">
                    {tt.poster.firstName[0]}{tt.poster.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{tt.poster.firstName} {tt.poster.lastName}</p>
                    {tt.poster.handicapIndex && <p className="text-xs text-gray-500">Handicap: {String(tt.poster.handicapIndex)}</p>}
                  </div>
                </div>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded font-medium">
                  <Users className="w-3 h-3 inline" /> {tt.spotsAvailable} spot{tt.spotsAvailable > 1 ? 's' : ''}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span>{tt.club?.name || tt.courseName || 'TBC'}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{formatDate(tt.teeTime)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>{formatTime(tt.teeTime)}</span>
                </div>
                {tt.greenFeePence && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <PoundSterling className="w-4 h-4 text-purple-600" />
                    <span>£{(tt.greenFeePence / 100).toFixed(0)} green fee</span>
                  </div>
                )}
              </div>

              {tt.notes && <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 dark:bg-gray-750 rounded-lg p-3">{tt.notes}</p>}

              {/* Interested players */}
              {tt.interests && tt.interests.length > 0 && (
                <div className="mt-3 pt-3 border-t dark:border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">{tt.interests.length} interested</p>
                  <div className="flex gap-2 flex-wrap">
                    {tt.interests.map(i => (
                      <span key={i.id} className={`text-xs px-2 py-1 rounded-full ${i.status === 'ACCEPTED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {i.player.firstName} {i.player.lastName} {i.status === 'ACCEPTED' && '✓'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user && (
                <div className="mt-4">
                  <button onClick={() => handleInterest(tt.id)} className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 font-medium">
                    I'm Interested
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* My Tee Times Tab */}
      {tab === 'mine' && (
        <div className="space-y-4">
          {myTeeTimes.length === 0 && <p className="text-center text-gray-500 py-8">You haven't posted any tee times yet.</p>}
          {myTeeTimes.map(tt => (
            <div key={tt.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{tt.club?.name || tt.courseName || 'TBC'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(tt.teeTime)} at {formatTime(tt.teeTime)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${tt.status === 'OPEN' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : tt.status === 'FILLED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 text-gray-700'}`}>
                    {tt.status}
                  </span>
                  {tt.status === 'OPEN' && (
                    <button onClick={() => handleCancel(tt.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                  )}
                </div>
              </div>

              {tt.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{tt.notes}</p>}

              {/* Manage interests */}
              {tt.interests && tt.interests.length > 0 && (
                <div className="border-t dark:border-gray-700 pt-3 mt-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interested Players:</p>
                  <div className="space-y-2">
                    {tt.interests.map(i => (
                      <div key={i.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 dark:bg-gray-750 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-bold text-green-700">
                            {i.player.firstName[0]}{i.player.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{i.player.firstName} {i.player.lastName}</p>
                            {i.player.handicapIndex && <p className="text-xs text-gray-500">HC: {String(i.player.handicapIndex)}</p>}
                          </div>
                          {i.message && <span className="text-xs text-gray-500 ml-2">"{i.message}"</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {i.status === 'PENDING' && tt.status === 'OPEN' && (
                            <>
                              <button onClick={() => handleAccept(tt.id, i.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                                <Check className="w-3 h-3 inline" /> Accept
                              </button>
                            </>
                          )}
                          {i.status === 'ACCEPTED' && <span className="text-xs text-green-600 font-medium">Accepted</span>}
                          {i.status === 'DECLINED' && <span className="text-xs text-red-600 font-medium">Declined</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tt.interests && tt.interests.length === 0 && tt.status === 'OPEN' && (
                <p className="text-sm text-gray-400 italic">No interest yet — hang tight!</p>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

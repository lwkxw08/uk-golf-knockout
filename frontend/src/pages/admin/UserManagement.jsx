import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Users, Search, Shield, ShieldOff, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

const ROLES = ['PLAYER', 'CLUB_MANAGER', 'ADMIN'];
const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-700',
  CLUB_MANAGER: 'bg-blue-100 text-blue-700',
  PLAYER: 'bg-green-100 text-green-700',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const data = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadUsers(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAction = async (userId, action, body = {}) => {
    setActionLoading(`${userId}-${action}`);
    setSuccess('');
    try {
      if (action === 'suspend') await api.post(`/admin/users/${userId}/suspend`);
      else if (action === 'reactivate') await api.post(`/admin/users/${userId}/reactivate`);
      else if (action === 'role') await api.post(`/admin/users/${userId}/role`, body);
      setSuccess(`User ${action === 'role' ? 'role updated' : action + 'd'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
      if (selectedUser?.id === userId) {
        const updated = await api.get(`/admin/users/${userId}`);
        setSelectedUser(updated);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const getName = (u) => {
    if (u.player) return `${u.player.firstName} ${u.player.lastName}`;
    if (u.clubManager?.club) return u.clubManager.club.name;
    return u.email.split('@')[0];
  };

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${total} registered users`} icon={Users} gradient="blue" compact />
      <div className="max-w-6xl mx-auto px-4 py-8">

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* User list */}
        <div className="flex-1">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer hover:border-green-300 transition ${
                    selectedUser?.id === u.id ? 'border-green-500 ring-1 ring-green-200' : ''
                  } ${!u.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                        {getName(u).split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getName(u)}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                      {!u.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Suspended</span>
                      )}
                      {u.emailVerified && (
                        <span className="text-green-600 text-xs" title="Email verified">Verified</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">No users found</div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* User detail panel */}
        {selectedUser && (
          <div className="w-80 bg-white border rounded-xl p-6 h-fit sticky top-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xl font-bold mx-auto mb-2">
                {getName(selectedUser).split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <h3 className="font-semibold text-gray-900">{getName(selectedUser)}</h3>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
              <div className="flex justify-center gap-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[selectedUser.role]}`}>
                  {selectedUser.role.replace('_', ' ')}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedUser.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {selectedUser.isActive ? 'Active' : 'Suspended'}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email Verified</span>
                <span className={selectedUser.emailVerified ? 'text-green-600' : 'text-amber-600'}>
                  {selectedUser.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
              {selectedUser.player && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Handicap</span>
                    <span>{selectedUser.player.handicapIndex ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Home Club</span>
                    <span className="text-right">{selectedUser.player.homeClub?.name || 'None'}</span>
                  </div>
                </>
              )}
              {selectedUser.clubManager?.club && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Manages</span>
                  <span className="text-right">{selectedUser.clubManager.club.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Joined</span>
                <span>{new Date(selectedUser.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <h4 className="font-medium text-gray-900 text-sm mb-2">Actions</h4>

              {/* Role change */}
              <div className="flex gap-1">
                {ROLES.map(r => (
                  <button
                    key={r}
                    disabled={selectedUser.role === r || actionLoading.startsWith(selectedUser.id)}
                    onClick={() => handleAction(selectedUser.id, 'role', { role: r })}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition ${
                      selectedUser.role === r
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:opacity-50`}
                  >
                    {r === 'CLUB_MANAGER' ? 'Manager' : r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Suspend / Reactivate */}
              {selectedUser.isActive ? (
                <button
                  onClick={() => handleAction(selectedUser.id, 'suspend')}
                  disabled={actionLoading === `${selectedUser.id}-suspend`}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  <ShieldOff className="w-4 h-4" />
                  {actionLoading === `${selectedUser.id}-suspend` ? 'Suspending...' : 'Suspend User'}
                </button>
              ) : (
                <button
                  onClick={() => handleAction(selectedUser.id, 'reactivate')}
                  disabled={actionLoading === `${selectedUser.id}-reactivate`}
                  className="w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {actionLoading === `${selectedUser.id}-reactivate` ? 'Reactivating...' : 'Reactivate User'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

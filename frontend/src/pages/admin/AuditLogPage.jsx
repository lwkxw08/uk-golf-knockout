import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Shield, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actions, setActions] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-log/actions').then(setActions).catch(() => {});
    api.get('/audit-log/entities').then(setEntities).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      const data = await api.get(`/audit-log?${params}`);
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const actionColor = (action) => {
    if (action.includes('LOGIN')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (action.includes('SUSPEND') || action.includes('DELETE')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (action.includes('CREATE') || action.includes('REACTIVAT')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  return (
    <div>
      <PageHeader title="Audit Log" subtitle={`${total} logged events`} icon={Shield} gradient="red" compact />
      <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, action, entity..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="border dark:border-gray-700 rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Entity</label>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="border dark:border-gray-700 rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Entities</option>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition">
            <Filter className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Log entries */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No audit log entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-900 dark:text-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Details</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{log.userEmail || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.entity}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

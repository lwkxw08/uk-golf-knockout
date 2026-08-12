import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Newspaper, Plus, Edit3, Trash2, Eye, EyeOff } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function AdminNewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', summary: '', content: '', category: 'Announcement', published: true });

  const loadArticles = () => {
    api.get('/news?all=true').then(data => setArticles(data.articles || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(loadArticles, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') {
        await api.post('/news', form);
      } else {
        await api.put(`/news/${editing}`, form);
      }
      setEditing(null);
      setForm({ title: '', summary: '', content: '', category: 'Announcement', published: true });
      loadArticles();
    } catch (err) {
      alert(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this article?')) return;
    await api.delete(`/news/${id}`);
    loadArticles();
  };

  const handleTogglePublish = async (article) => {
    await api.put(`/news/${article.id}`, { ...article, published: !article.published });
    loadArticles();
  };

  const startEdit = (article) => {
    setEditing(article.id);
    setForm({ title: article.title, summary: article.summary || '', content: article.content, category: article.category || 'Announcement', published: article.published });
  };

  return (
    <div>
      <PageHeader title="News Management" subtitle="Create, edit, and publish news articles for Luna Golf" icon={Newspaper} gradient="blue" compact />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {!editing && (
          <button onClick={() => { setEditing('new'); setForm({ title: '', summary: '', content: '', category: 'Announcement', published: true }); }}
            className="mb-6 bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Article
          </button>
        )}

        {editing && (
          <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-8 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editing === 'new' ? 'New Article' : 'Edit Article'}</h2>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm">
                  <option>Announcement</option>
                  <option>Tournament Update</option>
                  <option>Feature Release</option>
                  <option>Community</option>
                  <option>Club Spotlight</option>
                  <option>Tips & Advice</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary (shown on list page)</label>
              <input type="text" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })}
                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content *</label>
              <textarea required rows={12} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm resize-y" />
            </div>

            <div className="flex items-center gap-4 mb-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })}
                  className="rounded border-gray-300 text-green-700 focus:ring-green-500" />
                Publish immediately
              </label>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-xl transition">
                {editing === 'new' ? 'Publish Article' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="border dark:border-gray-600 text-gray-600 dark:text-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Articles List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No articles yet. Click "New Article" to create your first post.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map(a => (
              <div key={a.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${a.published ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{a.category || 'Announcement'}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">{a.title}</h3>
                  {a.summary && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{a.summary}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleTogglePublish(a)} title={a.published ? 'Unpublish' : 'Publish'}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                    {a.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => startEdit(a)} title="Edit"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} title="Delete"
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

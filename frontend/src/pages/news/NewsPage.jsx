import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Calendar, ChevronRight, Search } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../../components/layout/PageHeader';

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/news').then(data => setArticles(data.articles || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.summary?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="News & Updates" subtitle="Latest from Luna Golf — tournament announcements, feature updates, and community stories" icon={Newspaper} gradient="blue" compact />
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-500 dark:text-gray-400">{search ? 'No articles match your search' : 'No articles published yet'}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back soon for updates from Luna Golf</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map(article => (
              <Link key={article.id} to={`/news/${article.id}`}
                className="block bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {article.category && (
                        <span className="text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2.5 py-0.5 rounded-full">{article.category}</span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition mb-1">{article.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{article.summary}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-green-600 transition shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

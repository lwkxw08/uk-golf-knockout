import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { api } from '../../api/client';

export default function NewsArticlePage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/news/${id}`).then(setArticle).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    </div>
  );

  if (!article) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="text-gray-500 dark:text-gray-400">Article not found</p>
      <Link to="/news" className="text-green-700 dark:text-green-400 hover:underline mt-2 inline-block">← Back to News</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/news" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to News
      </Link>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            {article.category && (
              <span className="text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2.5 py-0.5 rounded-full">{article.category}</span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {article.author && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" /> {article.author}
              </span>
            )}
          </div>
        </header>

        {article.summary && (
          <p className="text-lg text-gray-600 dark:text-gray-300 border-l-4 border-green-500 pl-4 mb-8 italic">{article.summary}</p>
        )}

        <div className="prose prose-gray dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {article.content}
        </div>
      </article>
    </div>
  );
}

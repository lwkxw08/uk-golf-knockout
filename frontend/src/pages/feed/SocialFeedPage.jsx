import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Heart, Flame, Trophy, Megaphone, Tag, Send, ChevronDown, Clock, MapPin } from 'lucide-react';
import { api } from '../../api/client';

const REACTION_ICONS = { like: '👍', clap: '👏', fire: '🔥' };

export default function SocialFeedPage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [searchParams] = useSearchParams();

  const fetchPosts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (searchParams.get('tournamentId')) params.set('tournamentId', searchParams.get('tournamentId'));
      if (searchParams.get('clubId')) params.set('clubId', searchParams.get('clubId'));
      const res = await api.get(`/feed?${params}`);
      setPosts(p === 1 ? res.posts : prev => [...prev, ...res.posts]);
      setTotalPages(res.pages);
      setPage(p);
    } catch (err) {
      console.error('Failed to load feed:', err);
    }
    setLoading(false);
  }, [searchParams]);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  const handleReaction = async (postId, type = 'like') => {
    try {
      const res = await api.post(`/feed/${postId}/reactions`, { type });
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const delta = res.action === 'added' ? 1 : -1;
        return { ...p, reactionCount: p.reactionCount + delta, userReaction: res.action === 'added' ? type : null };
      }));
    } catch {}
  };

  const handleComment = async (postId) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    try {
      const comment = await api.post(`/feed/${postId}/comments`, { content: text });
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return { ...p, comments: [...p.comments, comment], commentCount: p.commentCount + 1 };
      }));
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    } catch {}
  };

  const getPostIcon = (type) => {
    switch (type) {
      case 'MATCH_RESULT': return <Trophy className="w-5 h-5 text-yellow-600" />;
      case 'PROMOTION': return <Tag className="w-5 h-5 text-green-600" />;
      case 'ANNOUNCEMENT': return <Megaphone className="w-5 h-5 text-blue-600" />;
      case 'PLAYER_ACHIEVEMENT': return <Flame className="w-5 h-5 text-orange-600" />;
      default: return <MessageSquare className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPostBadge = (type) => {
    const badges = {
      MATCH_RESULT: { label: 'Result', color: 'bg-yellow-100 text-yellow-800' },
      PROMOTION: { label: 'Offer', color: 'bg-green-100 text-green-800' },
      ANNOUNCEMENT: { label: 'News', color: 'bg-blue-100 text-blue-800' },
      PLAYER_ACHIEVEMENT: { label: 'Achievement', color: 'bg-orange-100 text-orange-800' },
    };
    const b = badges[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.color}`}>{b.label}</span>;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-7 h-7 text-green-700" />
        <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
      </div>

      {loading && posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Loading feed...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No activity yet — check back soon!</div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Post header */}
              <div className="px-4 pt-4 pb-2 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  {post.author ? (
                    <span className="text-sm font-bold text-green-700">
                      {post.author.firstName[0]}{post.author.lastName[0]}
                    </span>
                  ) : getPostIcon(post.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.author && (
                      <span className="font-semibold text-gray-900 text-sm">
                        {post.author.firstName} {post.author.lastName}
                      </span>
                    )}
                    {getPostBadge(post.type)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(post.createdAt)}</span>
                    {post.tournament && (
                      <>
                        <span>•</span>
                        <Link to={`/tournaments/${post.tournament.id}`} className="hover:text-green-700">{post.tournament.name}</Link>
                      </>
                    )}
                    {post.club && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.club.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Post content */}
              <div className="px-4 py-2">
                <p className="text-gray-800 text-sm leading-relaxed">{post.content}</p>
                {post.match && post.type === 'MATCH_RESULT' && (
                  <Link to={`/match/${post.match.id}/live`}
                    className="inline-block mt-2 text-xs text-green-700 hover:text-green-800 font-medium">
                    View Match Details →
                  </Link>
                )}
              </div>

              {/* Reactions & comment count */}
              <div className="px-4 py-2 flex items-center justify-between border-t border-gray-50">
                <div className="flex items-center gap-4">
                  {['like', 'clap', 'fire'].map(type => (
                    <button key={type} onClick={() => handleReaction(post.id, type)}
                      className={`flex items-center gap-1 text-sm transition-colors ${
                        post.userReaction === type ? 'text-green-700 font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <span className="text-base">{REACTION_ICONS[type]}</span>
                      {type === 'like' && post.reactionCount > 0 && <span>{post.reactionCount}</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentCount}</span>
                </button>
              </div>

              {/* Comments section */}
              {expandedComments[post.id] && (
                <div className="px-4 pb-3 border-t border-gray-100">
                  {post.comments.length > 0 && (
                    <div className="pt-2 space-y-2">
                      {post.comments.map(c => (
                        <div key={c.id} className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-gray-600">{c.player.firstName[0]}{c.player.lastName[0]}</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-1.5 flex-1">
                            <span className="text-xs font-semibold text-gray-800">{c.player.firstName} {c.player.lastName}</span>
                            <p className="text-xs text-gray-700 mt-0.5">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={commentText[post.id] || ''} onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                      placeholder="Write a comment..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-400" />
                    <button onClick={() => handleComment(post.id)} className="text-green-700 hover:text-green-800">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {page < totalPages && (
            <button onClick={() => fetchPosts(page + 1)}
              className="w-full py-3 text-sm text-green-700 hover:text-green-800 font-medium flex items-center justify-center gap-1">
              <ChevronDown className="w-4 h-4" /> Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, MessageCircle, Send, Image, Trash2, Users, Search } from 'lucide-react';

export default function SocialTimelinePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState(user ? 'following' : 'discover');
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [allComments, setAllComments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { loadPosts(); }, [tab]);

  const loadPosts = async () => {
    try {
      const endpoint = tab === 'following' ? '/social/posts/feed' : '/social/posts/discover';
      const data = await api.get(endpoint);
      setPosts(data.posts || []);
    } catch {}
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      await api.post('/social/posts', { content: newPost.trim() });
      setNewPost('');
      loadPosts();
    } catch {}
    setPosting(false);
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.post(`/social/posts/${postId}/like`);
      setPosts(posts.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (res.liked ? 1 : -1), isLiked: res.liked } : p));
    } catch {}
  };

  const handleComment = async (postId) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    try {
      const comment = await api.post(`/social/posts/${postId}/comment`, { content: text });
      setCommentText({ ...commentText, [postId]: '' });
      setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      setAllComments({ ...allComments, [postId]: [...(allComments[postId] || []), comment] });
    } catch {}
  };

  const loadComments = async (postId) => {
    if (showComments[postId]) {
      setShowComments({ ...showComments, [postId]: false });
      return;
    }
    try {
      const comments = await api.get(`/social/posts/${postId}/comments`);
      setAllComments({ ...allComments, [postId]: comments });
      setShowComments({ ...showComments, [postId]: true });
    } catch {}
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/social/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch {}
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await api.get(`/social/players/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.players || []);
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social</h1>
        <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200">
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Player Search */}
      {showSearch && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <input
            type="text"
            placeholder="Search players to follow..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 text-sm"
          />
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map(p => (
                <Link key={p.id} to={`/player/${p.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-bold text-green-700">
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{p.homeClub?.name || ''} {p.handicapIndex ? `• HC ${p.handicapIndex}` : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Post */}
      {user && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-6">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind? Share a round, post about a great shot, or just say hi..."
            className="w-full border-0 resize-none text-sm text-gray-900 dark:text-white dark:bg-gray-800 placeholder:text-gray-400 focus:ring-0"
            rows={3}
          />
          <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
            <div className="flex gap-2 text-gray-400">
              <Image className="w-5 h-5 cursor-pointer hover:text-green-600" title="Coming soon" />
            </div>
            <button onClick={handlePost} disabled={!newPost.trim() || posting} className="flex items-center gap-1 bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
              <Send className="w-4 h-4" /> Post
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b dark:border-gray-700">
        {user && <button onClick={() => setTab('following')} className={`pb-2 px-1 text-sm font-medium ${tab === 'following' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500'}`}>Following</button>}
        <button onClick={() => setTab('discover')} className={`pb-2 px-1 text-sm font-medium ${tab === 'discover' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500'}`}>Discover</button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {tab === 'following' ? 'Follow other players to see their posts here' : 'No posts yet — be the first!'}
            </p>
          </div>
        )}
        {posts.map(post => (
          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <Link to={`/player/${post.player.id}`} className="flex items-center gap-3 hover:opacity-80">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-bold text-green-700 dark:text-green-300 overflow-hidden">
                  {post.player.avatarUrl ? <img src={post.player.avatarUrl} className="w-full h-full object-cover" /> : `${post.player.firstName[0]}${post.player.lastName[0]}`}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{post.player.firstName} {post.player.lastName}</p>
                  <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </Link>
              {post.player.id === user?.playerId && (
                <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{post.content}</p>

            {post.images && post.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {post.images.map((img, i) => <img key={i} src={img} className="rounded-lg w-full h-40 object-cover" />)}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t dark:border-gray-700">
              <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1 text-sm ${post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} /> {post.likesCount}
              </button>
              <button onClick={() => loadComments(post.id)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500">
                <MessageCircle className="w-4 h-4" /> {post.commentsCount}
              </button>
            </div>

            {/* Comments */}
            {showComments[post.id] && (
              <div className="mt-3 pt-3 border-t dark:border-gray-700 space-y-2">
                {(allComments[post.id] || post.comments || []).map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600">
                      {c.player.firstName[0]}
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-750 rounded-lg px-3 py-1.5">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{c.player.firstName} {c.player.lastName}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{c.content}</p>
                    </div>
                  </div>
                ))}
                {user && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={commentText[post.id] || ''}
                      onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                      placeholder="Write a comment..."
                      className="flex-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 text-xs"
                    />
                    <button onClick={() => handleComment(post.id)} className="text-green-700 hover:text-green-800">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

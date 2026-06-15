import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Users, Heart, MessageCircle, UserPlus, UserMinus, MapPin, Calendar, Award } from 'lucide-react';

export default function PlayerPublicProfile() {
  const { playerId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, [playerId]);

  const loadProfile = async () => {
    try {
      const data = await api.get(`/social/profile/${playerId}`);
      setProfile(data);
      setIsFollowing(data.isFollowing);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadPosts = async () => {
    try {
      const data = await api.get(`/social/posts/player/${playerId}`);
      setPosts(data.posts || []);
    } catch {}
  };

  const handleFollow = async () => {
    try {
      const res = await api.post(`/social/follow/${playerId}`);
      setIsFollowing(res.following);
      loadProfile();
    } catch {}
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.post(`/social/posts/${postId}/like`);
      setPosts(posts.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + (res.liked ? 1 : -1), isLiked: res.liked } : p));
    } catch {}
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!profile) return <div className="text-center py-12 text-gray-500">Player not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900" />
        <div className="relative max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
            {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : `${profile.firstName[0]}${profile.lastName[0]}`}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-white">{profile.firstName} {profile.lastName}</h1>
            {profile.homeClub && (
              <p className="text-sm text-green-200 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> <Link to={`/clubs/${profile.homeClub.slug || profile.homeClub.id}`} className="hover:text-white">{profile.homeClub.name}</Link>
              </p>
            )}
            <div className="flex gap-4 mt-2 text-sm text-green-200">
              {profile.handicapIndex && <span>Handicap: <strong className="text-white">{String(profile.handicapIndex)}</strong></span>}
              <span><Calendar className="w-3 h-3 inline" /> Member since {new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
          {user && (
            <button onClick={handleFollow} className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium ${isFollowing ? 'bg-white/15 text-white' : 'bg-white text-green-800 hover:bg-green-50'}`}>
              {isFollowing ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <p className="text-xl font-bold text-white">{profile.stats.matchesPlayed}</p>
            <p className="text-xs text-green-200">Matches</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-300">{profile.stats.matchesWon}</p>
            <p className="text-xs text-green-200">Wins</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{profile.stats.winRate}%</p>
            <p className="text-xs text-green-200">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{profile.stats.followersCount}</p>
            <p className="text-xs text-green-200">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{profile.stats.followingCount}</p>
            <p className="text-xs text-green-200">Following</p>
          </div>
        </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b dark:border-gray-700">
        <button onClick={() => setTab('posts')} className={`pb-2 px-1 text-sm font-medium ${tab === 'posts' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500'}`}>Posts ({profile.stats.postsCount})</button>
        <button onClick={() => setTab('matches')} className={`pb-2 px-1 text-sm font-medium ${tab === 'matches' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500'}`}>Recent Matches</button>
      </div>

      {/* Posts Tab */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {posts.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">No posts yet</p>}
          {posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-bold text-green-700">
                  {post.player.firstName[0]}{post.player.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{post.player.firstName} {post.player.lastName}</p>
                  <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
              {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 mt-3 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.images.map((item, i) => {
                    const url = typeof item === 'string' ? item : item.url;
                    const type = typeof item === 'string' ? 'image' : (item.type || 'image');
                    return type === 'video' ? (
                      <video key={i} src={url} controls className="rounded-lg w-full max-h-80 object-cover bg-black" />
                    ) : (
                      <img key={i} src={url} className="rounded-lg w-full h-48 object-cover" />
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t dark:border-gray-700">
                <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1 text-sm ${post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                  <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} /> {post.likesCount}
                </button>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MessageCircle className="w-4 h-4" /> {post.commentsCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Matches Tab */}
      {tab === 'matches' && (
        <div className="space-y-3">
          {profile.recentMatches.length === 0 && <p className="text-center text-gray-500 py-8">No matches yet</p>}
          {profile.recentMatches.map(match => {
            const isWinner = match.winnerId === profile.id;
            const opponent = match.playerAId === profile.id ? match.playerB : match.playerA;
            return (
              <div key={match.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    vs {opponent?.firstName} {opponent?.lastName}
                  </p>
                  {match.tournament && <p className="text-xs text-gray-500">{match.tournament.name}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${isWinner ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : match.winnerId ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {isWinner ? 'Won' : match.winnerId ? 'Lost' : 'Halved'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

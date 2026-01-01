import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { User, Post } from '@booksharepdx/shared';
import { userService, postService, savedPostService, neighborhoodService } from '../services/dataService';
import { useUser } from '../contexts/UserContext';

type TabType = 'active' | 'archive' | 'saved';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { currentUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;

      setLoading(true);
      try {
        const userData = await userService.getByUsername(username);
        setUser(userData);

        if (userData) {
          const userPosts = await postService.getByUserId(userData.id);
          setPosts(userPosts);

          if (isOwnProfile && currentUser) {
            const saved = await savedPostService.getByUserId(currentUser.id);
            const savedPostsData = await Promise.all(
              saved.map(async (s) => {
                const post = await postService.getById(s.postId);
                return post;
              })
            );
            setSavedPosts(savedPostsData.filter((p): p is Post => p !== null));
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, isOwnProfile, currentUser]);

  const getActivePosts = () => posts.filter((p) => p.status === 'active');
  const getArchivedPosts = () => posts.filter((p) => p.status === 'archived');

  const getLocationDisplay = (user: User) => {
    if (user.location.type === 'neighborhood' && user.location.neighborhoodId) {
      const neighborhood = neighborhoodService.getById(user.location.neighborhoodId);
      return neighborhood?.name || 'Portland';
    }
    return 'Portland';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
          <Link to="/browse" className="link">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const tabPosts =
    activeTab === 'active'
      ? getActivePosts()
      : activeTab === 'archive'
      ? getArchivedPosts()
      : savedPosts;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.username}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary-100"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary-100 flex items-center justify-center border-4 border-primary-200">
                  <span className="text-4xl md:text-5xl font-bold text-primary-600">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full md:w-auto">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    {user.username}
                    {user.verified && (
                      <svg
                        className="w-6 h-6 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </h1>
                  <div className="text-gray-600 flex flex-wrap items-center gap-3 mt-1">
                    <span>{getLocationDisplay(user)}</span>
                    <span>•</span>
                    <span>Member since {formatDate(user.createdAt)}</span>
                  </div>
                </div>
                {isOwnProfile && (
                  <Link
                    to="/settings"
                    className="btn-secondary whitespace-nowrap self-start md:self-auto"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>

              {/* Bio */}
              {user.bio && <p className="text-gray-700 mb-4">{user.bio}</p>}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 md:gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {user.stats.booksGiven}
                  </div>
                  <div className="text-sm text-gray-600">Given</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {user.stats.booksReceived}
                  </div>
                  <div className="text-sm text-gray-600">Received</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {user.stats.bookshares}
                  </div>
                  <div className="text-sm text-gray-600">Bookshares</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'active'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Active Posts ({getActivePosts().length})
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'archive'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Archive ({getArchivedPosts().length})
              </button>
              {isOwnProfile && (
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'saved'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Saved ({savedPosts.length})
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tabPosts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">
                {activeTab === 'active' && 'No active posts yet.'}
                {activeTab === 'archive' && 'No archived posts yet.'}
                {activeTab === 'saved' && 'No saved posts yet.'}
              </p>
              {isOwnProfile && activeTab === 'active' && (
                <Link to="/create-post" className="link mt-2 inline-block">
                  Create your first post
                </Link>
              )}
            </div>
          ) : (
            tabPosts.map((post) => (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="card p-4 hover:shadow-lg transition-shadow"
              >
                {/* Book Cover */}
                {post.book.coverImage ? (
                  <img
                    src={post.book.coverImage}
                    alt={post.book.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-gray-400">No cover</span>
                  </div>
                )}

                {/* Book Info */}
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">
                  {post.book.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                  by {post.book.author}
                </p>

                {/* Type Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      post.type === 'giveaway'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {post.type === 'giveaway' ? 'Giveaway' : 'Exchange'}
                  </span>
                  {post.status === 'archived' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      Archived
                    </span>
                  )}
                </div>

                {/* Notes Preview */}
                {post.notes && (
                  <p className="text-sm text-gray-600 line-clamp-2">{post.notes}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

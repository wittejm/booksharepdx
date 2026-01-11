import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import type { User, Post } from '@booksharepdx/shared';
import { userService, postService, savedPostService, neighborhoodService } from '../services';
import { useUser } from '../contexts/UserContext';
import PostCard from '../components/PostCard';
import InlineShareForm from '../components/InlineShareForm';

type TabType = 'active' | 'archive' | 'saved' | 'loves' | 'lookingFor';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const { currentUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  const isOwnProfile = currentUser?.username === username;
  const shouldAutoFocusShare = searchParams.get('action') === 'share';

  const handleShareSuccess = () => {
    // Reload posts in background (no loading spinner)
    reloadPosts();
  };

  const reloadPosts = async () => {
    if (!user) return;
    try {
      const userPosts = await postService.getByUserId(user.id);
      setPosts(userPosts);
    } catch (error) {
      console.error('Failed to reload posts:', error);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">
            The user "{username}" could not be found. They may have changed their username or deleted their account.
          </p>
          <Link to="/browse" className="btn-primary">
            Browse Available Books
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
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {user.username}
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

        {/* Inline Share Form (only on own profile) */}
        {isOwnProfile && (
          <InlineShareForm
            onSuccess={handleShareSuccess}
            autoFocus={shouldAutoFocusShare}
          />
        )}

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
                Active Shares ({getActivePosts().length})
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
              <button
                onClick={() => setActiveTab('loves')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'loves'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Loves
              </button>
              <button
                onClick={() => setActiveTab('lookingFor')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'lookingFor'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Looking For
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {(activeTab === 'active' || activeTab === 'archive' || activeTab === 'saved') && (
          <div className="space-y-4">
            {tabPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  {activeTab === 'active' && 'No active shares yet. Use the form above to share a book!'}
                  {activeTab === 'archive' && 'No archived shares yet.'}
                  {activeTab === 'saved' && 'No saved shares yet.'}
                </p>
              </div>
            ) : (
              tabPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                />
              ))
            )}
          </div>
        )}

        {/* Loves Tab Content */}
        {activeTab === 'loves' && (
          <div className="space-y-8">
            {/* Genres Section */}
            {user.readingPreferences?.favoriteGenres && user.readingPreferences.favoriteGenres.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {user.readingPreferences.favoriteGenres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Books Section */}
            {user.readingPreferences?.favoriteBooks && user.readingPreferences.favoriteBooks.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 px-6">Books</h3>
                {user.readingPreferences.favoriteBooks.map((book, index) => (
                  <div key={index} className="card p-4 flex gap-4 hover:shadow-md transition-shadow">
                    {/* Book Cover */}
                    <div className="flex-shrink-0">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-24 h-36 md:w-32 md:h-48 object-cover rounded shadow-sm"
                        />
                      ) : (
                        <div className="w-24 h-36 md:w-32 md:h-48 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs text-center px-2">No Cover</span>
                        </div>
                      )}
                    </div>
                    {/* Book Info */}
                    <div className="flex-grow min-w-0">
                      <h4 className="font-bold text-lg text-gray-900">{book.title}</h4>
                      <p className="text-gray-600 text-sm">{book.author}</p>
                      <p className="text-sm text-gray-500 mt-2">{book.genre}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Books</h3>
                <div className="text-center py-8 text-gray-500 text-sm">
                  {isOwnProfile ? "You haven't added any favorite books yet." : "No favorite books added yet."}
                </div>
              </div>
            )}

            {/* Authors Section */}
            {user.readingPreferences?.favoriteAuthors && user.readingPreferences.favoriteAuthors.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 px-6">Authors</h3>
                {user.readingPreferences.favoriteAuthors.map((author) => (
                  <div
                    key={author}
                    className="card p-4 flex gap-4 items-center hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                      <span className="text-3xl md:text-4xl font-bold text-primary-600">
                        {author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-lg font-semibold text-gray-900">{author}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {(!user.readingPreferences?.favoriteGenres || user.readingPreferences.favoriteGenres.length === 0) &&
             (!user.readingPreferences?.favoriteAuthors || user.readingPreferences.favoriteAuthors.length === 0) &&
             (!user.readingPreferences?.favoriteBooks || user.readingPreferences.favoriteBooks.length === 0) && (
              <div className="card p-12 text-center">
                <p className="text-gray-600 mb-4">
                  {isOwnProfile ? "You haven't added any reading preferences yet." : "This user hasn't added any reading preferences yet."}
                </p>
                {isOwnProfile && (
                  <Link to="/settings" className="link">
                    Add Reading Preferences
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Looking For Tab Content */}
        {activeTab === 'lookingFor' && (
          <div className="space-y-8">
            {/* Genres Section */}
            {user.readingPreferences?.lookingForGenres && user.readingPreferences.lookingForGenres.length > 0 ? (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {user.readingPreferences.lookingForGenres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Genres</h3>
                <div className="text-center py-4 text-gray-500 text-sm">
                  {isOwnProfile ? "You haven't specified genres you're looking for yet." : "No genres specified yet."}
                </div>
              </div>
            )}

            {/* Books Section */}
            {user.readingPreferences?.lookingForBooks && user.readingPreferences.lookingForBooks.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 px-6">Books</h3>
                {user.readingPreferences.lookingForBooks.map((book, index) => (
                  <div key={index} className="card p-4 flex gap-4 hover:shadow-md transition-shadow">
                    {/* Book Cover */}
                    <div className="flex-shrink-0">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-24 h-36 md:w-32 md:h-48 object-cover rounded shadow-sm"
                        />
                      ) : (
                        <div className="w-24 h-36 md:w-32 md:h-48 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs text-center px-2">No Cover</span>
                        </div>
                      )}
                    </div>
                    {/* Book Info */}
                    <div className="flex-grow min-w-0">
                      <h4 className="font-bold text-lg text-gray-900">{book.title}</h4>
                      <p className="text-gray-600 text-sm">{book.author}</p>
                      <p className="text-sm text-gray-500 mt-2">{book.genre}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Books</h3>
                <div className="text-center py-8 text-gray-500 text-sm">
                  {isOwnProfile ? "You haven't added books you're looking for yet." : "No books specified yet."}
                </div>
              </div>
            )}

            {/* Authors Section */}
            {user.readingPreferences?.lookingForAuthors && user.readingPreferences.lookingForAuthors.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 px-6">Authors</h3>
                {user.readingPreferences.lookingForAuthors.map((author) => (
                  <div
                    key={author}
                    className="card p-4 flex gap-4 items-center hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <span className="text-3xl md:text-4xl font-bold text-blue-600">
                        {author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-lg font-semibold text-gray-900">{author}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Authors</h3>
                <div className="text-center py-8 text-gray-500 text-sm">
                  {isOwnProfile ? "You haven't added authors you're interested in yet." : "No authors specified yet."}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

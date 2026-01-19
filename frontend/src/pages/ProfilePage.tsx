import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import type { User, Post, MessageThread } from '@booksharepdx/shared';
import { userService, postService, neighborhoodService, messageService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/useToast';
import PostCard from '../components/PostCard';
import ToastContainer from '../components/ToastContainer';

type TabType = 'shares' | 'loves' | 'lookingFor';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { currentUser } = useUser();
  const { showToast, toasts, dismiss } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('shares');
  const [statsExpanded, setStatsExpanded] = useState(false);

  // Exchange mode: my exchange posts that this user has expressed interest in
  const [exchangeInfo, setExchangeInfo] = useState<{
    myPosts: Post[];
    threadIds: { [postId: string]: string };
  } | null>(null);

  // Redirect to my-profile if viewing your own profile
  if (currentUser?.username === username) {
    return <Navigate to="/my-profile" replace />;
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;

      setLoading(true);
      try {
        const userData = await userService.getByUsername(username);
        setUser(userData);

        if (userData) {
          const userPosts = await postService.getByUserId(userData.id);
          setPosts(userPosts.filter((p) => p.status === 'active'));

          // Check if this user has active threads on any of my exchange posts
          if (currentUser && userData.id !== currentUser.id) {
            await loadExchangeInfo(userData.id);
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, currentUser]);

  // Load exchange info: find my exchange posts where this user has expressed interest
  // but exclude threads where I've already proposed a trade
  const loadExchangeInfo = async (profileUserId: string) => {
    if (!currentUser) return;

    try {
      const threads = await messageService.getThreads();

      // Find threads where:
      // - I'm a participant
      // - The other participant is the profile user
      // - The thread is active (they expressed interest)
      // - The post is my exchange post
      // - I haven't already proposed a trade
      const myExchangePosts: Post[] = [];
      const threadIds: { [postId: string]: string } = {};

      for (const thread of threads) {
        if (thread.status !== 'active') continue;

        // Check if profile user is in this thread
        if (!thread.participants.includes(profileUserId)) continue;

        // Get the post
        const post = await postService.getById(thread.postId);
        if (!post) continue;

        // Check if it's MY exchange post (I'm the owner)
        if (post.userId === currentUser.id && post.type === 'exchange') {
          // Check if there's already a pending trade proposal in this thread
          const messages = await messageService.getMessages(thread.id);
          const hasPendingProposal = messages.some(
            m => m.type === 'trade_proposal' && m.proposalStatus === 'pending'
          );

          if (!hasPendingProposal) {
            myExchangePosts.push(post);
            threadIds[post.id] = thread.id;
          }
        }
      }

      if (myExchangePosts.length > 0) {
        setExchangeInfo({ myPosts: myExchangePosts, threadIds });
      } else {
        setExchangeInfo(null);
      }
    } catch (error) {
      console.error('Failed to load exchange info:', error);
      setExchangeInfo(null);
    }
  };

  const getLocationDisplay = (u: User) => {
    if (u.location.neighborhoodId) {
      const neighborhood = neighborhoodService.getById(u.location.neighborhoodId);
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
            The user "{username}" could not be found.
          </p>
          <Link to="/browse" className="btn-primary">
            Browse Available Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Exchange Mode Banner - non-dismissable, just informational */}
        {exchangeInfo && exchangeInfo.myPosts.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-blue-900">Exchange Available</p>
                <p className="text-sm text-blue-700">
                  {user?.username} is interested in {exchangeInfo.myPosts.length === 1
                    ? `"${exchangeInfo.myPosts[0].book.title}"`
                    : `${exchangeInfo.myPosts.length} of your books`
                  }. Click "Exchange" on any book to propose a trade.
                </p>
              </div>
            </div>
          </div>
        )}

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
              <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {user.preferredName || user.username}
                </h1>
                {user.preferredName && (
                  <div className="text-gray-500 text-sm">@{user.username}</div>
                )}
                <div className="text-gray-600 flex flex-wrap items-center gap-3 mt-1">
                  <span>{getLocationDisplay(user)}</span>
                  <span>•</span>
                  <span>Member since {formatDate(user.createdAt)}</span>
                </div>
              </div>

              {/* Bio */}
              {user.bio && <p className="text-gray-700 mb-4">{user.bio}</p>}

              {/* Stats */}
              <div>
                <button
                  onClick={() => setStatsExpanded(!statsExpanded)}
                  className="flex items-center gap-2 text-left hover:text-primary-600 transition-colors"
                >
                  <span className="text-2xl font-bold text-primary-600">
                    {user.stats.bookshares}
                  </span>
                  <span className="text-gray-700">Bookshares</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${statsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {statsExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex flex-col gap-2 md:flex-row md:gap-6">
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">Gave</span>
                        <span className="font-semibold text-primary-600 md:text-lg">{user.stats.booksGiven}</span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">Received</span>
                        <span className="font-semibold text-primary-600 md:text-lg">{user.stats.booksReceived}</span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">Loaned</span>
                        <span className="font-semibold text-primary-600 md:text-lg">{user.stats.booksLoaned}</span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">Borrowed</span>
                        <span className="font-semibold text-primary-600 md:text-lg">{user.stats.booksBorrowed}</span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">Traded</span>
                        <span className="font-semibold text-primary-600 md:text-lg">{user.stats.booksTraded}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('shares')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'shares'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Shares ({posts.length})
              </button>
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

        {/* Shares Tab */}
        {activeTab === 'shares' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No active shares yet.</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  exchangeInfo={exchangeInfo || undefined}
                />
              ))
            )}
          </div>
        )}

        {/* Loves Tab */}
        {activeTab === 'loves' && (
          <div className="space-y-8">
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

            {user.readingPreferences?.favoriteBooks && user.readingPreferences.favoriteBooks.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 px-6">Books</h3>
                {user.readingPreferences.favoriteBooks.map((book, index) => (
                  <div key={index} className="card p-4 flex gap-4">
                    <div className="flex-shrink-0">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="w-24 h-36 object-cover rounded shadow-sm" />
                      ) : (
                        <div className="w-24 h-36 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Cover</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{book.title}</h4>
                      <p className="text-gray-600 text-sm">{book.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user.readingPreferences?.favoriteAuthors && user.readingPreferences.favoriteAuthors.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Authors</h3>
                <div className="flex flex-wrap gap-2">
                  {user.readingPreferences.favoriteAuthors.map((author) => (
                    <span key={author} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {author}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!user.readingPreferences?.favoriteGenres?.length &&
              !user.readingPreferences?.favoriteAuthors?.length &&
              !user.readingPreferences?.favoriteBooks?.length) && (
              <div className="card p-12 text-center">
                <p className="text-gray-600">No reading preferences added yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Looking For Tab */}
        {activeTab === 'lookingFor' && (
          <div className="space-y-8">
            {user.readingPreferences?.lookingForGenres && user.readingPreferences.lookingForGenres.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {user.readingPreferences.lookingForGenres.map((genre) => (
                    <span key={genre} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {user.readingPreferences?.lookingForBooks && user.readingPreferences.lookingForBooks.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 px-6">Books</h3>
                {user.readingPreferences.lookingForBooks.map((book, index) => (
                  <div key={index} className="card p-4 flex gap-4">
                    <div className="flex-shrink-0">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="w-24 h-36 object-cover rounded shadow-sm" />
                      ) : (
                        <div className="w-24 h-36 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Cover</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{book.title}</h4>
                      <p className="text-gray-600 text-sm">{book.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user.readingPreferences?.lookingForAuthors && user.readingPreferences.lookingForAuthors.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Authors</h3>
                <div className="flex flex-wrap gap-2">
                  {user.readingPreferences.lookingForAuthors.map((author) => (
                    <span key={author} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {author}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!user.readingPreferences?.lookingForGenres?.length &&
              !user.readingPreferences?.lookingForAuthors?.length &&
              !user.readingPreferences?.lookingForBooks?.length) && (
              <div className="card p-12 text-center">
                <p className="text-gray-600">No preferences added yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

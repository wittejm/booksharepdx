import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post, User } from '@booksharepdx/shared';
import { postService, userService } from '../services';
import PortlandMap from '../components/PortlandMap';

export default function LandingPage() {
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const posts = await postService.getActive();

        // Get last 10 posts, sorted by most recent
        const sorted = posts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
        setRecentPosts(sorted);

        // Build author map from embedded user data
        const userMap = new Map<string, User>();
        sorted.forEach(p => {
          if (p.user) userMap.set(p.userId, p.user);
        });
        setAuthors(userMap);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-warm-50 min-h-[600px] flex items-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-20 -mr-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-warm-100 rounded-full blur-3xl opacity-20 -ml-48"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Left side - Text content */}
            <div className="space-y-6">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                  Share books with your neighbors.
                </h1>
                <p className="text-xl text-gray-600 mt-6 leading-relaxed">
                  Build community, one page at a time. Discover local books, connect with readers in your neighborhood.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex justify-center">
                <Link
                  to="/signup"
                  className="btn-primary text-center px-8 py-3 text-lg rounded-lg font-semibold hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
              </div>

              {/* Map - Desktop only, below buttons */}
              <div className="hidden md:block mt-8">
                <PortlandMap />
              </div>
            </div>

            {/* Right side - Recent Books Feed (desktop: 5, tablet: 3, mobile: 2) */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Books near you
              </h3>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-lg h-24 animate-pulse"></div>
                  ))}
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="bg-white rounded-lg p-8 shadow-md text-center">
                  <div className="text-4xl mb-2">📚</div>
                  <p className="text-gray-600 text-sm">No books in this area yet. Be the first to share!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentPosts.slice(0, 5).map((post, index) => {
                    const author = authors.get(post.userId);
                    // Desktop: show 5, Tablet (lg): show 3, Mobile: show 2
                    const hideOnTablet = index >= 3 ? 'hidden lg:block' : '';
                    const hideOnMobile = index >= 2 ? 'hidden md:block' : '';

                    return (
                      <Link
                        key={post.id}
                        to={`/share/${post.id}`}
                        className={`${hideOnMobile} ${hideOnTablet} block bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden border border-gray-200 hover:border-primary-400 group`}
                      >
                        <div className="flex gap-3 p-3 items-start">
                          {/* Column 1: Book Cover */}
                          <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-primary-200 to-warm-200 rounded flex items-center justify-center overflow-hidden">
                            {post.book.coverImage ? (
                              <img
                                src={post.book.coverImage}
                                alt={post.book.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">📖</span>
                            )}
                          </div>

                          {/* Column 2: Book Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm truncate group-hover:text-primary-600 transition-colors">
                              {post.book.title}
                            </h4>
                            <p className="text-xs text-gray-600 truncate mt-0.5">
                              {post.book.author}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs font-semibold text-primary-600">
                                {post.type === 'giveaway' ? 'Gift' : 'Exchange'}
                              </span>
                            </div>
                          </div>

                          {/* Column 3: User info - Right aligned */}
                          {author && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                                {author.username}
                              </span>
                              {author.profilePicture ? (
                                <img
                                  src={author.profilePicture}
                                  alt={author.username}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[#164E4A] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {author.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}

                  {/* "See all" link */}
                  <Link
                    to="/browse"
                    className="flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-100 rounded-lg p-3 text-primary-700 font-semibold text-sm transition-colors group"
                  >
                    <span>Browse All Books</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Join our growing community!</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Account</h3>
              <p className="text-gray-600">
                Sign up with your email and tell us about yourself. It takes just 2 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📖</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">List Your Books</h3>
              <p className="text-gray-600">
                List books you want to give away or trade.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">💬</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect & Message</h3>
              <p className="text-gray-600">
                Browse local books and message neighbors. Arrange pickup times and locations.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✨</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Build Community</h3>
              <p className="text-gray-600">
                Exchange books, make friends, and strengthen your neighborhood connections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to share?</h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Join the BookSharePDX community today and start building meaningful connections through a shared love of reading.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Get Started Now
            </Link>
            <Link
              to="/about"
              className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-800 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

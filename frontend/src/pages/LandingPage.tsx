import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post, User } from '@booksharepdx/shared';
import { postService, userService } from '../services/dataService';

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

        // Load author data
        const allUsers = await userService.getAll();
        const userMap = new Map(allUsers.map(u => [u.id, u]));
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                  Share books with your neighbors.
                </h1>
                <p className="text-xl text-gray-600 mt-6 leading-relaxed">
                  Build community, one page at a time. Discover local books, connect with readers in your neighborhood, and grow your library sustainably.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="btn-primary text-center px-8 py-3 text-lg rounded-lg font-semibold hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
                <Link
                  to="/browse"
                  className="btn bg-white text-primary-600 border-2 border-primary-600 px-8 py-3 text-lg rounded-lg font-semibold hover:bg-primary-50 transition-all"
                >
                  Browse Books
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center space-x-6 pt-4">
                <div>
                  <p className="text-2xl font-bold text-primary-600">{recentPosts.length}+</p>
                  <p className="text-sm text-gray-600">Books Available</p>
                </div>
                <div className="w-px h-12 bg-gray-300"></div>
                <div>
                  <p className="text-2xl font-bold text-primary-600">{authors.size}+</p>
                  <p className="text-sm text-gray-600">Community Members</p>
                </div>
              </div>
            </div>

            {/* Right side - Recent Books Feed (desktop: 5, tablet: 3, mobile: 2) */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide md:hidden">
                Recently Shared
              </h3>
              {loading ? (
                <div className="hidden md:flex flex-col gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-lg h-24 animate-pulse"></div>
                  ))}
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="hidden md:block bg-white rounded-lg p-8 shadow-md text-center">
                  <div className="text-4xl mb-2">📚</div>
                  <p className="text-gray-600 text-sm">No books yet. Be the first to share!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentPosts.slice(0, 5).map((post, index) => {
                    const author = authors.get(post.userId);
                    // Desktop: show 5, Tablet (lg): show 3, Mobile: show 2
                    const hideOnTablet = index >= 3 ? 'hidden lg:flex' : '';
                    const hideOnMobile = index >= 2 ? 'hidden md:flex' : '';

                    return (
                      <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className={`${hideOnMobile} ${hideOnTablet} bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden border border-gray-200 hover:border-primary-400 group`}
                      >
                        <div className="flex gap-3 p-3">
                          {/* Book Cover */}
                          <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-primary-200 to-warm-200 rounded flex items-center justify-center text-2xl">
                            📖
                          </div>

                          {/* Book Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm truncate group-hover:text-primary-600 transition-colors">
                              {post.book.title}
                            </h4>
                            <p className="text-xs text-gray-600 truncate mt-0.5">
                              {post.book.author}
                            </p>
                            {author && (
                              <p className="text-xs text-gray-500 truncate mt-1">
                                by {author.username}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs font-semibold text-primary-600">
                                {post.type === 'giveaway' ? 'Free' : 'Trade'}
                              </span>
                              {post.status === 'active' && (
                                <span className="text-xs text-green-600 font-medium">•  Available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {/* "See all" link - only on desktop */}
                  <Link
                    to="/browse"
                    className="hidden md:flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-100 rounded-lg p-3 text-primary-700 font-semibold text-sm transition-colors group"
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
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting started is simple. Join thousands of Portlanders sharing their love of reading.
            </p>
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
                Share books you want to lend or give away. Add photos and details about each book.
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

      {/* Why BookSharePDX Section */}
      <section className="py-20 bg-warm-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Why BookSharePDX?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We believe in building connections and reducing waste. Here's what makes us different.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Community Focused */}
            <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Community Focused</h3>
              <p className="text-gray-600 leading-relaxed">
                BookSharePDX is built for neighbors helping neighbors. We prioritize building real relationships and strengthening local communities across Portland.
              </p>
            </div>

            {/* Sustainable */}
            <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Sustainable</h3>
              <p className="text-gray-600 leading-relaxed">
                Keep books in circulation. Sharing reduces waste, saves money, and gives books a second life. Every exchange matters.
              </p>
            </div>

            {/* Local First */}
            <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Neighborhood Based</h3>
              <p className="text-gray-600 leading-relaxed">
                Browse books in your neighborhood or nearby areas. Meet locals, make new friends, and discover your community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* More Books Section - skip first 5 shown in hero */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">More Available Books</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover more books shared by your neighbors across Portland.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading books...</p>
            </div>
          ) : recentPosts.length <= 5 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">That's all for now! Check back soon for more.</p>
              <Link to="/browse" className="btn-primary inline-block">
                Browse All Books
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {recentPosts.slice(5, 10).map((post) => {
                const author = authors.get(post.userId);
                return (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 hover:border-primary-300"
                  >
                    {/* Book Cover Placeholder */}
                    <div className="w-full h-48 bg-gradient-to-br from-primary-200 to-warm-200 flex items-center justify-center text-5xl">
                      📖
                    </div>

                    {/* Post Details */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate text-sm">
                        {post.book.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        by {post.book.author}
                      </p>
                      {author && (
                        <p className="text-xs text-gray-500 mt-3 font-medium">
                          posted by {author.username}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary-600">
                          {post.type === 'giveaway' ? 'Free' : 'Trade'}
                        </span>
                        {post.status === 'active' && (
                          <span className="text-xs text-green-600 font-medium">Available</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="text-center mt-12">
            <Link to="/browse" className="btn-primary text-lg px-8 py-3">
              Browse All Books
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to share?</h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Join the BookSharePDX community today and start building meaningful connections through the power of reading.
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

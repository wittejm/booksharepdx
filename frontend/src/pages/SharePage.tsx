import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import type { Post } from '@booksharepdx/shared';
import { postService, savedPostService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useInterest } from '../contexts/InterestContext';
import ShareCard from '../components/ShareCard';
import PostCard from '../components/PostCard';
import InlineShareForm from '../components/InlineShareForm';

type TabType = 'active' | 'archive' | 'saved';

export default function SharePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useUser();
  const { summary: interestSummary } = useInterest();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasScrolledToInterest = useRef(false);

  const shouldAutoFocusShare = searchParams.get('action') === 'share';
  const shouldScrollToInterest = searchParams.get('scrollToInterest') === 'true';

  const handleShareSuccess = () => {
    reloadPosts();
  };

  const reloadPosts = async () => {
    if (!currentUser) return;
    try {
      const userPosts = await postService.getByUserId(currentUser.id);
      setPosts(userPosts);
    } catch (error) {
      console.error('Failed to reload posts:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const userPosts = await postService.getByUserId(currentUser.id);
        setPosts(userPosts);

        const saved = await savedPostService.getByUserId(currentUser.id);
        const savedPostsData = await Promise.all(
          saved.map(async (s) => {
            const post = await postService.getById(s.postId);
            return post;
          })
        );
        setSavedPosts(savedPostsData.filter((p): p is Post => p !== null));
      } catch (error) {
        console.error('Failed to load shares:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Scroll to first post with interest when requested
  useEffect(() => {
    if (
      shouldScrollToInterest &&
      !loading &&
      !hasScrolledToInterest.current &&
      interestSummary.interests.length > 0
    ) {
      // Find the first post with active interest
      const firstInterestPostId = interestSummary.interests[0]?.postId;
      if (firstInterestPostId) {
        const element = postRefs.current.get(firstInterestPostId);
        if (element) {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight effect
            element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
            }, 2000);
          }, 100);
          hasScrolledToInterest.current = true;
          // Remove the query param
          setSearchParams({}, { replace: true });
        }
      }
    }
  }, [shouldScrollToInterest, loading, interestSummary, setSearchParams]);

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const getActivePosts = () => posts.filter((p) => p.status === 'active');
  const getArchivedPosts = () => posts.filter((p) => p.status === 'archived');

  const tabPosts =
    activeTab === 'active'
      ? getActivePosts()
      : activeTab === 'archive'
      ? getArchivedPosts()
      : savedPosts;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading your shares...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Shares</h1>

        {/* Inline Share Form */}
        <InlineShareForm
          onSuccess={handleShareSuccess}
          autoFocus={shouldAutoFocusShare}
        />

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
                Active ({getActivePosts().length})
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
            </nav>
          </div>
        </div>

        {/* Content */}
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
              <div
                key={post.id}
                ref={(el) => {
                  if (el) postRefs.current.set(post.id, el);
                  else postRefs.current.delete(post.id);
                }}
                className="transition-all duration-300"
              >
                {activeTab === 'saved' ? (
                  <PostCard post={post} />
                ) : (
                  <ShareCard post={post} onUpdate={reloadPosts} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

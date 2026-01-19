import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Post, MessageThread } from '@booksharepdx/shared';
import { messageService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useUser as useFetchUser } from '../hooks/useDataLoader';
import { useToast } from './useToast';
import { useConfirm } from './useConfirm';
import { setPendingAction } from '../utils/pendingAuth';
import PostCardMenu from './PostCardMenu';
import RequestForm from './RequestForm';
import BookDisplay, { TypeBadge } from './BookDisplay';
import Avatar from './Avatar';

// Exchange info for when viewing someone's books who has interest in your exchange posts
interface ExchangeInfo {
  myPosts: Post[];  // My exchange posts this user is interested in
  threadIds: { [myPostId: string]: string };  // Map from my post ID to thread ID
}

interface PostCardProps {
  post: Post;
  distance?: number;
  autoOpenRequest?: boolean;
  exchangeInfo?: ExchangeInfo;  // Present when this user has interest in my exchange posts
}

/**
 * PostCard - Displays a post for viewing (not for the owner)
 * Used on BrowsePage and ProfilePage
 */
export default function PostCard({ post, distance, autoOpenRequest, exchangeInfo }: PostCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [showContactForm, setShowContactForm] = useState(false);
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false);
  const [proposingExchange, setProposingExchange] = useState(false);
  const [existingThread, setExistingThread] = useState<MessageThread | null>(null);

  // Load post owner using data loader hook
  const { user: postUser } = useFetchUser(post.userId);

  // Determine if we're in exchange mode (can't exchange for loans)
  const canExchange = exchangeInfo && exchangeInfo.myPosts.length > 0 && post.type !== 'loan';

  // Check if user has already requested this book
  useEffect(() => {
    if (!currentUser) return;

    messageService.getThreads().then(threads => {
      const thread = threads.find(t =>
        t.postId === post.id &&
        t.participants.includes(currentUser.id) &&
        !['declined_by_owner', 'cancelled_by_requester', 'completed'].includes(t.status || '')
      );
      setExistingThread(thread || null);
    });
  }, [currentUser, post.id]);

  // Auto-open request form and scroll to card if specified
  useEffect(() => {
    if (autoOpenRequest && currentUser) {
      setShowContactForm(true);
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [autoOpenRequest, currentUser]);

  const handleWantThis = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setPendingAction({
        type: 'request',
        postId: post.id,
        returnTo: '/browse',
      });
      navigate('/login');
      return;
    }
    setShowContactForm(true);
  };

  const handleExchangeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!exchangeInfo) return;

    // If only one post, propose directly
    if (exchangeInfo.myPosts.length === 1) {
      handleProposeExchange(exchangeInfo.myPosts[0]);
    } else {
      // Show dropdown for multiple posts
      setShowExchangeDropdown(!showExchangeDropdown);
    }
  };

  const handleProposeExchange = async (myPost: Post) => {
    if (!exchangeInfo) return;
    const threadId = exchangeInfo.threadIds[myPost.id];
    if (!threadId) return;

    const confirmed = await confirm({
      title: 'Propose Exchange',
      message: `Exchange your "${myPost.book.title}" for their "${post.book.title}"?`,
      confirmText: 'Propose Exchange',
      variant: 'info'
    });
    if (!confirmed) return;

    setProposingExchange(true);
    setShowExchangeDropdown(false);
    try {
      await messageService.sendMessage({
        threadId,
        content: '', // Content is ignored for trade_proposal, visual is rendered from post data
        type: 'trade_proposal',
        offeredPostId: myPost.id,    // My book (what I'm offering)
        requestedPostId: post.id,     // Their book (what I want)
      });
      showToast('Exchange proposal sent!', 'success');
      // Navigate back to shares page, focused on the post with the thread open
      navigate(`/share?focusPost=${myPost.id}&showThread=${threadId}`);
    } catch (error) {
      console.error('Failed to propose exchange:', error);
      showToast('Failed to send exchange proposal', 'error');
    } finally {
      setProposingExchange(false);
    }
  };

  const isOwnPost = currentUser?.id === post.userId;

  return (
    <div ref={cardRef} className="card hover:shadow-lg transition-shadow relative">
      {/* Three-dot Menu - only show for other users' posts */}
      {!isOwnPost && (
        <div className="absolute top-3 right-3">
          <PostCardMenu
            postId={post.id}
            postUserId={post.userId}
            postUserUsername={postUser?.username}
          />
        </div>
      )}

      <div className="p-4">
        <BookDisplay book={post.book} showTypeBadge={false}>
          {/* Type Badge and Request/Exchange Button */}
          <div className="flex items-center justify-between mt-1 mb-2 pr-3">
            <TypeBadge type={post.type} />
            {!isOwnPost && post.status === 'active' && !showContactForm && (
              canExchange ? (
                // Exchange mode - show Exchange button with optional dropdown
                <div className="relative">
                  <button
                    onClick={handleExchangeClick}
                    disabled={proposingExchange}
                    className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1 disabled:opacity-50"
                  >
                    {proposingExchange ? 'Sending...' : 'Exchange'}
                    {exchangeInfo && exchangeInfo.myPosts.length > 1 && (
                      <svg className={`w-4 h-4 transition-transform ${showExchangeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  {/* Dropdown for multiple exchange posts */}
                  {showExchangeDropdown && exchangeInfo && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExchangeDropdown(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]">
                        {exchangeInfo.myPosts.map(myPost => (
                          <button
                            key={myPost.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProposeExchange(myPost);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Exchange for "{myPost.book.title}"
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : existingThread ? (
                // Already requested - link to activity page
                <Link
                  to={`/activity?thread=${existingThread.id}`}
                  className="bg-blue-600 text-white text-sm py-1.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  You requested this
                </Link>
              ) : (
                // Normal mode - show Request button
                <button
                  onClick={handleWantThis}
                  className="btn-primary text-sm py-1.5 px-4"
                >
                  Request
                </button>
              )
            )}
          </div>

          {/* User Info */}
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              {postUser && (
                <>
                  <Avatar src={postUser.profilePicture} username={postUser.username} size="sm" />
                  <Link
                    to={`/profile/${postUser.username}`}
                    className="font-medium hover:text-primary-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {postUser.username}
                  </Link>
                </>
              )}
              {distance !== undefined && (
                <span className="text-gray-400">• {distance.toFixed(1)} mi away</span>
              )}
            </div>
          </div>
        </BookDisplay>
      </div>

      {/* Request Form */}
      {showContactForm && (
        <RequestForm
          postId={post.id}
          postUserId={post.userId}
          onCancel={() => setShowContactForm(false)}
          onSuccess={(thread) => {
            setExistingThread(thread);
            setShowContactForm(false);
          }}
        />
      )}
      {ConfirmDialogComponent}
    </div>
  );
}

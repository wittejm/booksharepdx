import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Post, Interest, User, MessageThread } from '@booksharepdx/shared';
import { postService, interestService, userService, messageService } from '../services';
import { useConfirm } from './useConfirm';
import { useToast } from './useToast';
import { useUser } from '../contexts/UserContext';
import { useInterest } from '../contexts/InterestContext';
import BookDisplay from './BookDisplay';
import Avatar from './Avatar';
import ThreadMessages from './ThreadMessages';

interface ShareCardProps {
  post: Post;
  onUpdate?: () => void;
  autoFocusThreadId?: string | null;  // Thread ID to auto-open after exchange proposal
  onAutoFocusComplete?: () => void;   // Called after auto-focus is complete
}

/**
 * ShareCard - Displays a post from the owner's perspective
 * Used on SharePage for managing your own shares
 */
export default function ShareCard({ post, onUpdate, autoFocusThreadId, onAutoFocusComplete }: ShareCardProps) {
  const { currentUser } = useUser();
  const { summary: interestSummary } = useInterest();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { showToast } = useToast();

  // Get interest count for this post from context
  const interestCount = interestSummary.interests.filter(i => i.postId === post.id).length;
  const [showMenu, setShowMenu] = useState(false);
  // Auto-expand interest list if 1-3 people are interested
  const [showInterests, setShowInterests] = useState(interestCount >= 1 && interestCount <= 3);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [interestedUsers, setInterestedUsers] = useState<{ [userId: string]: User }>({});
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Accepted thread state (for pending completion)
  const [acceptedThread, setAcceptedThread] = useState<MessageThread | null>(null);
  const [acceptedUser, setAcceptedUser] = useState<User | null>(null);

  // Messages display state
  const [showMessagesForThread, setShowMessagesForThread] = useState<string | null>(null);

  // Loan offer state
  const [showLoanOffer, setShowLoanOffer] = useState<Interest | null>(null);
  const [loanDueDays, setLoanDueDays] = useState<number>(post.loanDuration || 30);
  const [customDueDate, setCustomDueDate] = useState<string>('');
  const [useCustomDate, setUseCustomDate] = useState(false);

  // Load accepted thread for pending_exchange posts (includes on_loan threads for loans)
  useEffect(() => {
    if (post.status === 'pending_exchange' && currentUser) {
      loadAcceptedThread();
    }
  }, [post.id, post.status, currentUser]);

  // State for on_loan threads (separate from accepted)
  const [onLoanThread, setOnLoanThread] = useState<MessageThread | null>(null);
  const [borrowerUser, setBorrowerUser] = useState<User | null>(null);

  // Load on_loan thread for loan posts
  useEffect(() => {
    if (post.type === 'loan' && currentUser) {
      loadOnLoanThread();
    }
  }, [post.id, post.type, currentUser]);

  // Load interests when expanded
  useEffect(() => {
    if (showInterests && post.status === 'active') {
      loadInterests();
    }
  }, [showInterests, post.id, post.status]);

  // Auto-focus on a specific thread (e.g., after proposing an exchange)
  useEffect(() => {
    if (autoFocusThreadId) {
      // Expand interests and show messages for this thread
      setShowInterests(true);
      setShowMessagesForThread(autoFocusThreadId);
      // Call the completion callback after a short delay
      if (onAutoFocusComplete) {
        setTimeout(() => {
          onAutoFocusComplete();
        }, 500);
      }
    }
  }, [autoFocusThreadId]);

  const loadAcceptedThread = async () => {
    try {
      const threads = await messageService.getThreads();
      const accepted = threads.find(
        t => t.postId === post.id && t.status === 'accepted' && !t.ownerCompleted
      );
      if (accepted) {
        setAcceptedThread(accepted);
        const otherUserId = accepted.participants.find(p => p !== currentUser?.id);
        if (otherUserId) {
          const user = await userService.getById(otherUserId);
          setAcceptedUser(user);
        }
      }
    } catch (error) {
      console.error('Failed to load accepted thread:', error);
    }
  };

  const loadOnLoanThread = async () => {
    try {
      const threads = await messageService.getThreads();
      const onLoan = threads.find(
        t => t.postId === post.id && t.status === 'on_loan'
      );
      if (onLoan) {
        setOnLoanThread(onLoan);
        const otherUserId = onLoan.participants.find(p => p !== currentUser?.id);
        if (otherUserId) {
          const user = await userService.getById(otherUserId);
          setBorrowerUser(user);
        }
      }
    } catch (error) {
      console.error('Failed to load on_loan thread:', error);
    }
  };

  const loadInterests = async () => {
    setLoadingInterests(true);
    try {
      const postInterests = await interestService.getByPostId(post.id);
      setInterests(postInterests);

      // Load user data for each interest
      const users: { [userId: string]: User } = {};
      for (const interest of postInterests) {
        const user = await userService.getById(interest.interestedUserId);
        if (user) {
          users[interest.interestedUserId] = user;
        }
      }
      setInterestedUsers(users);
    } catch (error) {
      console.error('Failed to load interests:', error);
    } finally {
      setLoadingInterests(false);
    }
  };

  const handleAccept = async (interest: Interest) => {
    const user = interestedUsers[interest.interestedUserId];
    if (!user) return;

    // For loans, show the loan offer modal instead of direct accept
    if (post.type === 'loan') {
      setShowLoanOffer(interest);
      setLoanDueDays(post.loanDuration || 30);
      setUseCustomDate(false);
      return;
    }

    const otherInterestCount = interests.filter(i => i.id !== interest.id).length;
    const confirmed = await confirm({
      title: 'Accept Request',
      message: `Give "${post.book.title}" to ${user.username}?${otherInterestCount > 0 ? ' Other interested people will be notified.' : ''}`,
      confirmText: 'Yes, give to them',
      variant: 'info'
    });
    if (!confirmed) return;

    setActionLoading(interest.id);
    try {
      // The interest.id is actually the thread id
      await messageService.updateThreadStatus(interest.id, 'accepted');
      showToast(`Accepted! You can now coordinate with ${user.username}.`, 'success');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to accept:', error);
      showToast('Failed to accept request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLoanOffer = async () => {
    if (!showLoanOffer) return;
    const user = interestedUsers[showLoanOffer.interestedUserId];
    if (!user) return;

    // Calculate due date
    let dueDate: number;
    if (useCustomDate && customDueDate) {
      dueDate = new Date(customDueDate).getTime();
    } else {
      const now = new Date();
      now.setDate(now.getDate() + loanDueDays);
      dueDate = now.getTime();
    }

    setActionLoading(showLoanOffer.id);
    try {
      await messageService.updateThreadStatus(showLoanOffer.id, 'accepted', { loanDueDate: dueDate });
      showToast(`Loan offered to ${user.username}!`, 'success');
      setShowLoanOffer(null);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to offer loan:', error);
      showToast('Failed to offer loan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGiveForever = async () => {
    if (!showLoanOffer) return;
    const user = interestedUsers[showLoanOffer.interestedUserId];
    if (!user) return;

    const confirmed = await confirm({
      title: 'Give Forever',
      message: `Convert this loan to a gift and give "${post.book.title}" to ${user.username} permanently?`,
      confirmText: 'Yes, give forever',
      variant: 'info'
    });
    if (!confirmed) return;

    setActionLoading(showLoanOffer.id);
    try {
      await messageService.updateThreadStatus(showLoanOffer.id, 'accepted', { convertToGift: true });
      showToast(`Converted to gift for ${user.username}!`, 'success');
      setShowLoanOffer(null);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to convert to gift:', error);
      showToast('Failed to convert to gift', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReturn = async (relistPost: boolean) => {
    if (!onLoanThread || !borrowerUser) return;

    const actionText = relistPost ? 'Relist Book' : 'Archive Book';
    const confirmed = await confirm({
      title: 'Confirm Return',
      message: `Confirm that ${borrowerUser.username} returned "${post.book.title}"? The book will be ${relistPost ? 'relisted for others' : 'archived'}.`,
      confirmText: actionText,
      variant: 'info'
    });
    if (!confirmed) return;

    setActionLoading(onLoanThread.id);
    try {
      const result = await messageService.confirmReturn(onLoanThread.id, relistPost);
      if (result.bothConfirmedReturn) {
        showToast(relistPost ? 'Book returned and relisted!' : 'Book returned! Loan complete.', 'success');
      } else {
        showToast(`Marked as returned. Waiting for ${borrowerUser.username} to confirm.`, 'success');
      }
      setOnLoanThread(null);
      setBorrowerUser(null);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to confirm return:', error);
      showToast('Failed to confirm return', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (interest: Interest) => {
    const user = interestedUsers[interest.interestedUserId];
    if (!user) return;

    const confirmed = await confirm({
      title: 'Decline Request',
      message: `Decline ${user.username}'s request for "${post.book.title}"?`,
      confirmText: 'Decline',
      variant: 'danger'
    });
    if (!confirmed) return;

    setActionLoading(interest.id);
    try {
      await messageService.updateThreadStatus(interest.id, 'declined_by_owner');
      showToast('Request declined', 'info');
      await loadInterests(); // Refresh the list
    } catch (error) {
      console.error('Failed to decline:', error);
      showToast('Failed to decline request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGiftCompleted = async () => {
    if (!acceptedThread || !acceptedUser) return;

    const confirmed = await confirm({
      title: 'Confirm Gift',
      message: `Confirm that you gave "${post.book.title}" to ${acceptedUser.username}?`,
      confirmText: 'Yes, I gave it',
      variant: 'info'
    });
    if (!confirmed) return;

    setActionLoading(acceptedThread.id);
    try {
      const result = await messageService.markComplete(acceptedThread.id);
      if (result.bothCompleted) {
        showToast('Gift completed! Stats updated.', 'success');
      } else {
        showToast(`Marked as given. Waiting for ${acceptedUser.username} to confirm receipt.`, 'success');
      }
      onUpdate?.();
    } catch (error) {
      console.error('Failed to complete gift:', error);
      showToast('Failed to mark as completed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsGiven = async () => {
    const confirmed = await confirm({
      title: 'Mark as Given',
      message: 'Mark this book as given away?',
      confirmText: 'Mark as Given',
      variant: 'info'
    });
    if (!confirmed) return;

    await postService.update(post.id, {
      status: 'archived',
      archivedAt: Date.now(),
    });
    setShowMenu(false);
    onUpdate?.();
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    await postService.delete(post.id);
    setShowMenu(false);
    onUpdate?.();
  };

  const handleReactivate = async () => {
    const confirmed = await confirm({
      title: 'Reactivate Post',
      message: 'Make this book available again?',
      confirmText: 'Reactivate',
      variant: 'info'
    });
    if (!confirmed) return;

    await postService.update(post.id, {
      status: 'active',
      archivedAt: undefined,
    });
    setShowMenu(false);
    onUpdate?.();
  };

  return (
    <>
      {ConfirmDialogComponent}

      {/* Loan Offer Modal */}
      {showLoanOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Offer Loan</h3>
            <p className="text-gray-600 mb-4">
              Loan "{post.book.title}" to {interestedUsers[showLoanOffer.interestedUserId]?.username}
            </p>

            {/* Duration options */}
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-gray-700">Loan Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => { setLoanDueDays(days); setUseCustomDate(false); }}
                    className={`p-2 rounded-lg border-2 transition-colors text-sm ${
                      !useCustomDate && loanDueDays === days
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setUseCustomDate(!useCustomDate)}
                className={`w-full p-2 rounded-lg border-2 transition-colors text-sm ${
                  useCustomDate
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Custom date
              </button>

              {useCustomDate && (
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className="input w-full"
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLoanOffer}
                disabled={actionLoading === showLoanOffer.id || (useCustomDate && !customDueDate)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === showLoanOffer.id ? 'Offering...' : 'Offer Loan'}
              </button>
              <button
                onClick={handleGiveForever}
                disabled={actionLoading === showLoanOffer.id}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Give Forever (Convert to Gift)
              </button>
              <button
                onClick={() => setShowLoanOffer(null)}
                disabled={actionLoading === showLoanOffer.id}
                className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card hover:shadow-lg transition-shadow relative">
        {/* Three-dot Menu */}
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48">
                  {post.status === 'active' ? (
                    <>
                      <button
                        onClick={handleMarkAsGiven}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Mark as Given
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleReactivate}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Reactivate
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          <BookDisplay book={post.book} type={post.type} status={post.status}>
            {/* Notes */}
            {post.notes && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.notes}</p>
            )}
          </BookDisplay>

          {/* Interest Alert - attention grabber for posts with interest */}
          {post.status === 'active' && interestCount > 0 && (
            <button
              onClick={() => setShowInterests(true)}
              className="mt-3 w-full p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-600 text-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="font-medium text-blue-800">
                  {interestCount === 1
                    ? 'Someone is interested!'
                    : `${interestCount} people are interested!`}
                </span>
              </div>
            </button>
          )}

          {/* Interest Section - only for active posts */}
          {post.status === 'active' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowInterests(!showInterests)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showInterests ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>
                  {interests.length > 0
                    ? `${interests.length} ${interests.length === 1 ? 'person' : 'people'} interested`
                    : 'View requests'}
                </span>
              </button>

              {showInterests && (
                <div className="mt-3 space-y-2">
                  {loadingInterests ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                  ) : interests.length === 0 ? (
                    <p className="text-sm text-gray-500">No one has expressed interest yet.</p>
                  ) : (
                    interests.map(interest => {
                      const user = interestedUsers[interest.interestedUserId];
                      if (!user) return null;

                      return (
                        <div
                          key={interest.id}
                          className="bg-gray-50 rounded-lg overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-3 p-3">
                            <Link
                              to={`/profile/${user.username}`}
                              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                            >
                              <Avatar src={user.profilePicture} username={user.username} size="sm" />
                              <span className="font-medium text-gray-900">{user.username}</span>
                            </Link>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowMessagesForThread(
                                  showMessagesForThread === interest.id ? null : interest.id
                                )}
                                className={`px-3 py-1 text-sm rounded transition-colors ${
                                  showMessagesForThread === interest.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {showMessagesForThread === interest.id ? 'Hide' : 'Message'}
                              </button>
                              {post.type === 'exchange' ? (
                                <>
                                  <Link
                                    to={`/profile/${user.username}?tradeFor=${post.id}&threadId=${interest.id}`}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                                  >
                                    View Books
                                  </Link>
                                  <button
                                    onClick={() => handleAccept(interest)}
                                    disabled={actionLoading === interest.id}
                                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                                    title="Give without exchange"
                                  >
                                    Gift
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleDecline(interest)}
                                    disabled={actionLoading === interest.id}
                                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    onClick={() => handleAccept(interest)}
                                    disabled={actionLoading === interest.id}
                                    className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === interest.id ? '...' : 'Accept'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Embedded messages */}
                          {showMessagesForThread === interest.id && (
                            <ThreadMessages
                              threadId={interest.id}
                              otherUsername={user.username}
                              highlightBanner={interest.id === autoFocusThreadId ? 'You proposed an exchange for this book' : undefined}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pending Completion Section - for pending_exchange posts */}
          {post.status === 'pending_exchange' && acceptedThread && acceptedUser && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={acceptedUser.profilePicture} username={acceptedUser.username} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Giving to {acceptedUser.username}
                        </p>
                        <p className="text-sm text-gray-600">
                          Coordinate to hand off the book
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowMessagesForThread(
                          showMessagesForThread === acceptedThread.id ? null : acceptedThread.id
                        )}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          showMessagesForThread === acceptedThread.id
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {showMessagesForThread === acceptedThread.id ? 'Hide Messages' : 'Messages'}
                      </button>
                      {!acceptedThread.ownerCompleted && (
                        <button
                          onClick={handleGiftCompleted}
                          disabled={actionLoading === acceptedThread.id}
                        className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === acceptedThread.id ? 'Confirming...' : 'Gift Completed'}
                      </button>
                    )}
                    {acceptedThread.ownerCompleted && (
                      <span className="px-3 py-1 text-sm text-green-700 bg-green-100 rounded">
                        ✓ You confirmed
                      </span>
                    )}
                  </div>
                </div>
                </div>
                {/* Embedded messages */}
                {showMessagesForThread === acceptedThread.id && (
                  <ThreadMessages
                    threadId={acceptedThread.id}
                    otherUsername={acceptedUser.username}
                  />
                )}
              </div>
            </div>
          )}

          {/* On Loan Section - for loan posts currently on loan */}
          {onLoanThread && borrowerUser && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {(() => {
                const isOverdue = onLoanThread.loanDueDate && onLoanThread.loanDueDate < Date.now();
                const dueDate = onLoanThread.loanDueDate ? new Date(onLoanThread.loanDueDate) : null;

                return (
                  <div className={`rounded-lg border overflow-hidden ${
                    isOverdue
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={borrowerUser.profilePicture} username={borrowerUser.username} size="sm" />
                          <div>
                            <p className={`font-medium ${isOverdue ? 'text-yellow-800' : 'text-purple-800'}`}>
                              On loan to {borrowerUser.username}
                            </p>
                            {dueDate && (
                              <p className={`text-sm ${isOverdue ? 'text-yellow-700 font-medium' : 'text-purple-600'}`}>
                                {isOverdue ? 'Overdue! Was due ' : 'Due '}
                                {dueDate.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowMessagesForThread(
                                showMessagesForThread === onLoanThread.id ? null : onLoanThread.id
                              )}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                showMessagesForThread === onLoanThread.id
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {showMessagesForThread === onLoanThread.id ? 'Hide Messages' : 'Messages'}
                            </button>
                          </div>
                        {!onLoanThread.ownerConfirmedReturn && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleConfirmReturn(true)}
                              disabled={actionLoading === onLoanThread.id}
                              className="px-3 py-1 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
                            >
                              {actionLoading === onLoanThread.id ? '...' : 'Received & Relist'}
                            </button>
                            <button
                              onClick={() => handleConfirmReturn(false)}
                              disabled={actionLoading === onLoanThread.id}
                              className="px-3 py-1 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                            >
                              Received & Archive
                            </button>
                          </div>
                        )}
                        {onLoanThread.ownerConfirmedReturn && (
                          <span className="px-3 py-1 text-sm text-purple-700 bg-purple-100 rounded">
                            ✓ You confirmed return
                          </span>
                        )}
                        </div>
                      </div>
                    </div>
                    {/* Embedded messages */}
                    {showMessagesForThread === onLoanThread.id && (
                      <ThreadMessages
                        threadId={onLoanThread.id}
                        otherUsername={borrowerUser.username}
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

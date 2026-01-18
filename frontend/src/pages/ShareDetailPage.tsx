import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { postService, messageService, neighborhoodService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useUser as useFetchUser, usePost as useFetchPost } from '../hooks/useDataLoader';
import { useToast } from '../components/useToast';
import ToastContainer from '../components/ToastContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../components/useConfirm';
import { formatTimestamp } from '../utils/time';

export default function ShareDetailPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const postId = shareId;
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // Load post and owner using data loader hooks
  const { post, loading: postLoading, error: postError } = useFetchPost(postId);
  const { user: postOwner, loading: ownerLoading } = useFetchUser(post?.userId);

  const loading = postLoading || ownerLoading;

  // "I'm Interested" modal state
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [interestedMessage, setInterestedMessage] = useState('');
  const [submittingInterest, setSubmittingInterest] = useState(false);

  // Toast state
  const { showToast, toasts, dismiss } = useToast();

  // Distance calculation (computed, not loaded)
  const distance = useMemo(() => {
    if (!postOwner || !currentUser) return '';
    if (postOwner.location.type === 'neighborhood' && currentUser.location.type === 'neighborhood') {
      if (postOwner.location.neighborhoodId === currentUser.location.neighborhoodId) {
        return 'Same neighborhood';
      }
      const ownerHood = neighborhoodService.getById(postOwner.location.neighborhoodId || '');
      const viewerHood = neighborhoodService.getById(currentUser.location.neighborhoodId || '');
      if (ownerHood && viewerHood) {
        const dist = Math.sqrt(
          Math.pow(ownerHood.centroid.lat - viewerHood.centroid.lat, 2) +
          Math.pow(ownerHood.centroid.lng - viewerHood.centroid.lng, 2)
        );
        return `~${Math.round(dist * 69)} miles away`;
      }
    }
    return 'Distance unknown';
  }, [postOwner, currentUser]);

  const handleInterestedSubmit = async () => {
    if (!currentUser || !post) return;

    try {
      setSubmittingInterest(true);

      const thread = await messageService.getOrCreateThread(
        currentUser.id,
        post.userId,
        post.id
      );
      await messageService.sendMessage({
        threadId: thread.id,
        content: interestedMessage.trim() || "Hi! I'm interested in this book.",
      });
      showToast('Message sent!', 'success');

      setShowInterestedModal(false);
      setInterestedMessage('');
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'POST_ARCHIVED') {
        showToast('This book is no longer available.', 'error');
      } else {
        showToast('Unable to send your message. Please try again.', 'error');
      }
      console.error(err);
    } finally {
      setSubmittingInterest(false);
    }
  };

  const handleMarkAsGiven = async () => {
    if (!post || !currentUser || post.userId !== currentUser.id) return;

    const confirmed = await confirm({
      title: 'Mark as Given',
      message: 'Mark this book as given away?',
      confirmText: 'Mark as Given',
      variant: 'info'
    });
    if (!confirmed) return;

    try {
      await postService.update(post.id, {
        status: 'archived',
        archivedAt: Date.now(),
      });
      showToast('Post marked as given!', 'success');
      setTimeout(() => navigate('/profile/' + currentUser.username), 1000);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'NOT_POST_OWNER') {
        showToast('You can only update your own listings.', 'error');
      } else {
        showToast('Unable to update the listing. Please try again.', 'error');
      }
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!post || !currentUser || post.userId !== currentUser.id) return;

    const confirmed = await confirm({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await postService.delete(post.id);
      showToast('Post deleted!', 'success');
      setTimeout(() => navigate('/profile/' + currentUser.username), 1000);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'NOT_POST_OWNER') {
        showToast('You can only delete your own listings.', 'error');
      } else if (error.code === 'POST_NOT_FOUND') {
        showToast('This listing has already been deleted.', 'error');
      } else {
        showToast('Unable to delete the listing. Please try again.', 'error');
      }
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <LoadingSpinner size="lg" className="text-primary-600" />
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (postError || !post || !postOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Book Listing Not Found</h2>
          <p className="text-gray-600 mb-6">This book listing could not be found. It may have been removed or archived.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(-1)} className="btn-secondary">
              Go Back
            </button>
            <button onClick={() => navigate('/browse')} className="btn-primary">
              Browse Available Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnPost = currentUser?.id === post.userId;

  return (
    <>
      {ConfirmDialogComponent}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-primary-600 hover:text-primary-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Main post card */}
        <div className="card p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Book cover */}
            <div className="md:col-span-1">
              {post.book.coverImage ? (
                <img
                  src={post.book.coverImage}
                  alt={post.book.title}
                  className="w-full rounded-lg shadow-md"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
            </div>

            {/* Post details */}
            <div className="md:col-span-2">
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  post.type === 'giveaway' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {post.type === 'giveaway' ? 'Give Away' : 'Exchange'}
                </span>
                {post.status === 'archived' && (
                  <span className="ml-2 inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Archived
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.book.title}</h1>
              <p className="text-xl text-gray-700 mb-4">by {post.book.author}</p>

              <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {post.book.genre}
                </span>
                {post.book.isbn && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ISBN: {post.book.isbn}
                  </span>
                )}
              </div>

              {post.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes from owner:</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{post.notes}</p>
                </div>
              )}

              {/* Owner info */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Shared by:</h3>
                <div className="flex items-center gap-4">
                  <Link to={`/profile/${postOwner.username}`}>
                    {postOwner.profilePicture ? (
                      <img
                        src={postOwner.profilePicture}
                        alt={postOwner.username}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-lg">
                          {postOwner.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <Link to={`/profile/${postOwner.username}`} className="font-semibold text-gray-900 hover:text-primary-600">
                      {postOwner.username}
                    </Link>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>{postOwner.stats.booksGiven} given</span>
                      <span>{postOwner.stats.booksReceived} received</span>
                    </div>
                  </div>
                </div>
                {distance && (
                  <p className="text-sm text-gray-600 mt-3">{distance}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">Shared {formatTimestamp(post.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap gap-3">
            {isOwnPost ? (
              <>
                <button className="btn-secondary flex-1 sm:flex-none">
                  Edit
                </button>
                {post.status === 'active' && (
                  <button onClick={handleMarkAsGiven} className="btn-primary flex-1 sm:flex-none">
                    Mark as Given
                  </button>
                )}
                <button onClick={handleDelete} className="btn-secondary text-red-600 border-red-600 hover:bg-red-50 flex-1 sm:flex-none">
                  Delete
                </button>
              </>
            ) : (
              <>
                {post.status === 'active' && currentUser && (
                  <button
                    onClick={() => setShowInterestedModal(true)}
                    className="btn-primary flex-1 sm:flex-none"
                  >
                    I'm Interested
                  </button>
                )}
                {!currentUser && (
                  <button
                    onClick={() => navigate('/login')}
                    className="btn-primary flex-1 sm:flex-none"
                  >
                    Login to Express Interest
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* I'm Interested Modal - private message only */}
        {showInterestedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Send a Message</h3>

              <p className="text-gray-600 mb-4">
                Send a message to {postOwner.username} about this book.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your message
                </label>
                <textarea
                  value={interestedMessage}
                  onChange={(e) => setInterestedMessage(e.target.value)}
                  placeholder="Hi! I'm interested in this book."
                  className="input resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowInterestedModal(false);
                    setInterestedMessage('');
                  }}
                  className="btn-secondary flex-1"
                  disabled={submittingInterest}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInterestedSubmit}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submittingInterest}
                >
                  {submittingInterest ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </>
  );
}

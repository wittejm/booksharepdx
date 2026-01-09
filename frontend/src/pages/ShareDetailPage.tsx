import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Post, User, Comment } from '@booksharepdx/shared';
import { postService, userService, commentService, messageService, neighborhoodService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/useToast';
import ToastContainer from '../components/ToastContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../components/useConfirm';
import { formatTimestamp } from '../utils/time';

export default function ShareDetailPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const postId = shareId; // Alias for compatibility with existing code
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  const [post, setPost] = useState<Post | null>(null);
  const [postOwner, setPostOwner] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentUsers, setCommentUsers] = useState<{ [userId: string]: User }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // "I'm Interested" modal state
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [interestedMessage, setInterestedMessage] = useState('');
  const [interestedType, setInterestedType] = useState<'public' | 'private'>('public');
  const [submittingInterest, setSubmittingInterest] = useState(false);

  // Toast state
  const { showToast, toasts, dismiss } = useToast();

  // Distance calculation (placeholder)
  const [distance, setDistance] = useState<string>('');

  useEffect(() => {
    loadPostData();
  }, [postId]);

  const loadPostData = async () => {
    if (!postId) {
      setError('Post not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch post
      const fetchedPost = await postService.getById(postId);
      if (!fetchedPost) {
        setError('Post not found');
        setLoading(false);
        return;
      }
      setPost(fetchedPost);

      // Fetch post owner
      const owner = await userService.getById(fetchedPost.userId);
      setPostOwner(owner);

      // Calculate distance
      if (owner && currentUser) {
        const dist = calculateDistance(owner, currentUser);
        setDistance(dist);
      }

      // Fetch comments
      const fetchedComments = await commentService.getByPostId(postId);
      // Sort by timestamp (oldest first)
      fetchedComments.sort((a, b) => a.timestamp - b.timestamp);
      setComments(fetchedComments);

      // Fetch comment users
      const userIds = [...new Set(fetchedComments.map(c => c.userId))];
      const users: { [userId: string]: User } = {};
      for (const userId of userIds) {
        const user = await userService.getById(userId);
        if (user) {
          users[userId] = user;
        }
      }
      setCommentUsers(users);

    } catch (err) {
      setError('Failed to load post');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (owner: User, viewer: User): string => {
    // Placeholder distance calculation
    if (owner.location.type === 'neighborhood' && viewer.location.type === 'neighborhood') {
      if (owner.location.neighborhoodId === viewer.location.neighborhoodId) {
        return 'Same neighborhood';
      }
      const ownerHood = neighborhoodService.getById(owner.location.neighborhoodId || '');
      const viewerHood = neighborhoodService.getById(viewer.location.neighborhoodId || '');
      if (ownerHood && viewerHood) {
        const dist = Math.sqrt(
          Math.pow(ownerHood.centroid.lat - viewerHood.centroid.lat, 2) +
          Math.pow(ownerHood.centroid.lng - viewerHood.centroid.lng, 2)
        );
        return `~${Math.round(dist * 69)} miles away`; // Rough conversion
      }
    }
    return 'Distance unknown';
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !post || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const comment = await commentService.create({
        postId: post.id,
        userId: currentUser.id,
        content: newComment.trim(),
      });

      setComments([...comments, comment]);
      setCommentUsers({
        ...commentUsers,
        [currentUser.id]: currentUser,
      });
      setNewComment('');
      showToast('Comment added!', 'success');
    } catch (err) {
      showToast('Failed to add comment', 'error');
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleInterestedSubmit = async () => {
    if (!currentUser || !post) return;

    try {
      setSubmittingInterest(true);

      if (interestedType === 'public') {
        // Add as public comment
        await commentService.create({
          postId: post.id,
          userId: currentUser.id,
          content: interestedMessage.trim() || "I'm interested in this book!",
        });
        showToast('Comment posted!', 'success');
        await loadPostData();
      } else {
        // Send private message
        const thread = await messageService.getOrCreateThread(
          currentUser.id,
          post.userId,
          post.id
        );
        await messageService.sendMessage({
          threadId: thread.id,
          senderId: currentUser.id,
          content: interestedMessage.trim() || "Hi! I'm interested in this book.",
          type: 'user',
        });
        showToast('Message sent!', 'success');
      }

      setShowInterestedModal(false);
      setInterestedMessage('');
    } catch (err) {
      showToast('Failed to express interest', 'error');
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
      showToast('Failed to update post', 'error');
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
      showToast('Failed to delete post', 'error');
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

  if (error || !post || !postOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Share Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The share you are looking for does not exist.'}</p>
          <button onClick={() => navigate('/browse')} className="btn-primary">
            Browse Books
          </button>
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
      <div className="card p-6 md:p-8 mb-8">
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
                  {postOwner.verified && (
                    <svg className="inline-block w-4 h-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span>{postOwner.stats.booksGiven} given</span>
                    <span>{postOwner.stats.bookshares} bookshares</span>
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
              <button className="btn-secondary flex-1 sm:flex-none">
                Share
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
              <button className="btn-secondary flex-1 sm:flex-none">
                Share
              </button>
            </>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="card p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Comments ({comments.length})
        </h2>

        {/* Add comment form (if logged in) */}
        {currentUser && post.status === 'active' && (
          <form onSubmit={handleAddComment} className="mb-8">
            <div className="flex gap-3">
              {currentUser.profilePicture ? (
                <img
                  src={currentUser.profilePicture}
                  alt={currentUser.username}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-semibold">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="input resize-none"
                  rows={3}
                  disabled={submittingComment}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Comments list */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => {
              const user = commentUsers[comment.userId];
              if (!user) return null;

              return (
                <div key={comment.id} className="flex gap-3">
                  <Link to={`/profile/${user.username}`}>
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/profile/${user.username}`} className="font-semibold text-gray-900 hover:text-primary-600">
                          {user.username}
                        </Link>
                        {user.verified && (
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-sm text-gray-500">{formatTimestamp(comment.timestamp)}</span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* I'm Interested Modal */}
      {showInterestedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Express Interest</h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">How would you like to reach out?</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="interest-type"
                    value="public"
                    checked={interestedType === 'public'}
                    onChange={(e) => setInterestedType(e.target.value as 'public')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div>
                    <div className="font-medium">Public Comment</div>
                    <div className="text-sm text-gray-600">Post a comment visible to everyone</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="interest-type"
                    value="private"
                    checked={interestedType === 'private'}
                    onChange={(e) => setInterestedType(e.target.value as 'private')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div>
                    <div className="font-medium">Private Message</div>
                    <div className="text-sm text-gray-600">Send a direct message to the owner</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                value={interestedMessage}
                onChange={(e) => setInterestedMessage(e.target.value)}
                placeholder={interestedType === 'public' ? "I'm interested in this book!" : "Hi! I'm interested in this book."}
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
                {submittingInterest ? 'Sending...' : 'Send'}
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

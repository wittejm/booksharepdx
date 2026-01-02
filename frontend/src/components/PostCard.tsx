import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Post, User, Comment } from '@booksharepdx/shared';
import { userService, postService, savedPostService, blockService, reportService, commentService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useConfirm } from './useConfirm';
import ReportModal from './ReportModal';

interface PostCardProps {
  post: Post;
  expanded?: boolean;
  onToggle?: () => void;
  distance?: number;
}

export default function PostCard({ post, expanded = false, onToggle, distance }: PostCardProps) {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showMenu, setShowMenu] = useState(false);
  const [postUser, setPostUser] = useState<User | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentUsers, setCommentUsers] = useState<Record<string, User>>({});

  // Load post user and comments on mount
  useEffect(() => {
    userService.getById(post.userId).then(setPostUser);

    // Load comments for this post
    const loadComments = async () => {
      const postComments = await commentService.getByPostId(post.id);
      setComments(postComments);

      // Load users for each comment
      const users: Record<string, User> = {};
      for (const comment of postComments) {
        const user = await userService.getById(comment.userId);
        if (user) {
          users[comment.userId] = user;
        }
      }
      setCommentUsers(users);
    };
    loadComments();
  }, [post.id, post.userId]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsExpanded(!isExpanded);
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
    navigate(0);
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
    navigate('/browse');
  };

  const handleBlock = async () => {
    if (!currentUser) return;

    const confirmed = await confirm({
      title: 'Block User',
      message: 'Block this user? You will no longer see their posts.',
      confirmText: 'Block',
      variant: 'warning'
    });
    if (!confirmed) return;

    await blockService.block(currentUser.id, post.userId);
    setShowMenu(false);
    navigate(0);
  };

  const handleReport = async (reasons: string[], details?: string) => {
    if (!currentUser) return;

    await reportService.create({
      reporterId: currentUser.id,
      reportedPostId: post.id,
      reportedUserId: post.userId,
      reasons: reasons as any,
      details,
    });

    setShowReportModal(false);
    setShowMenu(false);
  };

  const handleInterested = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    await savedPostService.save(currentUser.id, post.id, true);
    setIsInterested(true);
    // In a real app, this would also create a message thread or send a notification
    alert('Interest expressed! You can now message the owner.');
  };

  const isOwnPost = currentUser?.id === post.userId;

  return (
    <>
      {ConfirmDialogComponent}
      <div className="card hover:shadow-lg transition-shadow">
      {/* Collapsed State - Always Visible */}
      <div className="flex gap-4 p-4 cursor-pointer" onClick={handleToggle}>
        {/* Book Cover */}
        <div className="flex-shrink-0">
          {post.book.coverImage ? (
            <img
              src={post.book.coverImage}
              alt={post.book.title}
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
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-grow min-w-0">
              <h3 className="font-bold text-lg text-gray-900 truncate">{post.book.title}</h3>
              <p className="text-gray-600 text-sm truncate">{post.book.author}</p>
            </div>

            {/* Type Badge */}
            <div className="flex-shrink-0">
              {post.type === 'giveaway' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Give Away
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Exchange
                </span>
              )}
            </div>
          </div>

          {/* Genre */}
          <p className="text-sm text-gray-500 mb-2">{post.book.genre}</p>

          {/* User Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {postUser && (
              <>
                {postUser.profilePicture && (
                  <img
                    src={postUser.profilePicture}
                    alt={postUser.username}
                    className="w-6 h-6 rounded-full"
                  />
                )}
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

          {/* Expand/Collapse Indicator */}
          <div className="mt-3 flex items-center gap-1 text-sm text-primary-600 font-medium">
            {comments.length > 0 && (
              <span className="text-base">💬</span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Three-dot Menu */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48">
                {isOwnPost ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsGiven();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mark as Given
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReportModal(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Report Post
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBlock();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Block User
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div className="border-t border-gray-200 px-4 pb-4">
          {/* Notes */}
          {post.notes && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-700 text-sm">{post.notes}</p>
            </div>
          )}

          {/* I'm Interested Button */}
          {!isOwnPost && currentUser && (
            <div className="mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInterested();
                }}
                disabled={isInterested}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInterested ? "Interest Expressed!" : "I'm Interested"}
              </button>
            </div>
          )}

          {!currentUser && (
            <div className="mt-4">
              <Link to="/login" className="btn-primary block text-center w-full">
                Login to Express Interest
              </Link>
            </div>
          )}

          {/* Public Responses */}
          {comments.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Public Responses ({comments.length})</h4>
              <div className="space-y-3">
                {comments.map((comment) => {
                  const commentUser = commentUsers[comment.userId];
                  return (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        {commentUser?.profilePicture && (
                          <img
                            src={commentUser.profilePicture}
                            alt={commentUser.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            {commentUser && (
                              <Link
                                to={`/profile/${commentUser.username}`}
                                className="font-medium text-gray-900 hover:text-primary-600 transition-colors text-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {commentUser.username}
                              </Link>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(comment.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      {postUser && (
        <ReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetUserId={post.userId}
          targetPostId={post.id}
          onSubmit={handleReport}
        />
      )}
      </div>
    </>
  );
}

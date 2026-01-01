import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post, User } from '@booksharepdx/shared';
import { userService, postService, savedPostService, blockService, reportService } from '../services/dataService';
import { useUser } from '../contexts/UserContext';

interface PostCardProps {
  post: Post;
  expanded?: boolean;
  onToggle?: () => void;
  currentUserId?: string;
  distance?: number;
}

export default function PostCard({ post, expanded = false, onToggle, distance }: PostCardProps) {
  const { currentUser } = useUser();
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showMenu, setShowMenu] = useState(false);
  const [postUser, setPostUser] = useState<User | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReasons, setReportReasons] = useState<string[]>([]);
  const [reportDetails, setReportDetails] = useState('');
  const [isInterested, setIsInterested] = useState(false);

  // Load post user on mount
  useState(() => {
    userService.getById(post.userId).then(setPostUser);
  });

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleEdit = () => {
    // Navigate to edit page (to be implemented)
    window.location.href = `/post/edit/${post.id}`;
    setShowMenu(false);
  };

  const handleMarkAsGiven = async () => {
    if (!confirm('Mark this book as given away?')) return;

    await postService.update(post.id, {
      status: 'archived',
      archivedAt: Date.now(),
    });
    setShowMenu(false);
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    await postService.delete(post.id);
    setShowMenu(false);
    window.location.reload();
  };

  const handleBlock = async () => {
    if (!currentUser || !confirm('Block this user? You will no longer see their posts.')) return;

    await blockService.block(currentUser.id, post.userId);
    setShowMenu(false);
    window.location.reload();
  };

  const handleReport = async () => {
    if (!currentUser) return;

    if (reportReasons.length === 0) {
      alert('Please select at least one reason');
      return;
    }

    await reportService.create({
      reporterId: currentUser.id,
      reportedPostId: post.id,
      reportedUserId: post.userId,
      reasons: reportReasons as any,
      details: reportDetails,
    });

    setShowReportModal(false);
    setShowMenu(false);
    alert('Report submitted. Thank you for keeping our community safe.');
  };

  const handleInterested = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    await savedPostService.save(currentUser.id, post.id, true);
    setIsInterested(true);
    // In a real app, this would also create a message thread or send a notification
    alert('Interest expressed! You can now message the owner.');
  };

  const isOwnPost = currentUser?.id === post.userId;

  return (
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
                {postUser.verified && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </>
            )}
            {distance !== undefined && (
              <span className="text-gray-400">• {distance.toFixed(1)} mi away</span>
            )}
          </div>

          {/* Expand/Collapse Indicator */}
          <div className="mt-3 flex items-center text-sm text-primary-600 font-medium">
            <span>{isExpanded ? 'Show less' : 'Show more'}</span>
            <svg
              className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                        handleEdit();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </button>
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

          {/* Comments Section Placeholder */}
          <div className="mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">Comments</h4>
            <p className="text-gray-500 text-sm italic">Comments feature coming soon...</p>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Report Post</h3>

            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-600">Select all that apply:</p>
              {['spam', 'harassment', 'scam', 'inappropriate', 'other'].map((reason) => (
                <label key={reason} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportReasons.includes(reason)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setReportReasons([...reportReasons, reason]);
                      } else {
                        setReportReasons(reportReasons.filter(r => r !== reason));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{reason}</span>
                </label>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Additional details (optional)"
              className="input w-full h-24 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReasons([]);
                  setReportDetails('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleReport} className="btn-primary flex-1">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

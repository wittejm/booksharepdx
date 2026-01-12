import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Post, User } from '@booksharepdx/shared';
import { userService, postService, savedPostService, blockService, reportService, commentService, messageService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useConfirm } from './useConfirm';
import ReportModal from './ReportModal';

interface PostCardProps {
  post: Post;
  distance?: number;
}

export default function PostCard({ post, distance }: PostCardProps) {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [showMenu, setShowMenu] = useState(false);
  const [postUser, setPostUser] = useState<User | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [sendType, setSendType] = useState<'public' | 'private'>('public');
  const [isSending, setIsSending] = useState(false);
  const [genresExpanded, setGenresExpanded] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(0);

  // Load post user on mount
  useEffect(() => {
    userService.getById(post.userId).then(setPostUser);
  }, [post.userId]);

  const handleCardClick = () => {
    navigate(`/share/${post.id}`);
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

  const handleWantThis = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setShowContactForm(true);
  };

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || !contactMessage.trim()) return;

    setIsSending(true);
    try {
      if (sendType === 'public') {
        await commentService.create({
          postId: post.id,
          userId: currentUser.id,
          content: contactMessage.trim(),
        });
        setLocalCommentCount(prev => prev + 1);
      } else {
        const thread = await messageService.getOrCreateThread(currentUser.id, post.userId, post.id);
        await messageService.sendMessage({
          threadId: thread.id,
          senderId: currentUser.id,
          content: contactMessage.trim(),
          type: 'user',
        });
      }
      setContactMessage('');
      setShowContactForm(false);
      setSendType('public');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContactForm(false);
    setContactMessage('');
    setSendType('public');
  };

  const isOwnPost = currentUser?.id === post.userId;

  return (
    <>
      {ConfirmDialogComponent}
      <div className="card hover:shadow-lg transition-shadow cursor-pointer relative" onClick={handleCardClick}>
      {/* Three-dot Menu - positioned absolutely */}
      <div className="absolute top-3 right-3">
        <div className="relative">
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

      <div className="flex gap-4 p-4">
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
          <h3 className="font-bold text-lg text-gray-900 pr-8">{post.book.title}</h3>
          <p className="text-gray-600 text-sm pr-8">{post.book.author}</p>

          {/* Genre */}
          <p className="text-sm text-gray-500 mt-1">
            {(() => {
              const genres = post.book.genre.split(/[,\/]/).map(g => g.trim()).filter(Boolean);
              if (genres.length <= 1) {
                return post.book.genre;
              }
              if (genresExpanded) {
                return (
                  <span
                    onClick={(e) => { e.stopPropagation(); setGenresExpanded(false); }}
                    className="cursor-pointer hover:text-gray-700"
                  >
                    {genres.join(', ')}
                  </span>
                );
              }
              return (
                <>
                  {genres[0]}
                  <span
                    onClick={(e) => { e.stopPropagation(); setGenresExpanded(true); }}
                    className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    ...
                  </span>
                </>
              );
            })()}
          </p>

          {/* Type Badge and Request Button */}
          <div className="flex items-center justify-between mt-1 mb-2 pr-3">
            {post.type === 'giveaway' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Give Away
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Exchange
              </span>
            )}
            {!isOwnPost && post.status === 'active' && !showContactForm && (
              <button
                onClick={handleWantThis}
                className="btn-primary text-sm py-1.5 px-4"
              >
                Request
              </button>
            )}
          </div>

          {/* User Info */}
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              {postUser && (
                <>
                  {postUser.profilePicture ? (
                    <img
                      src={postUser.profilePicture}
                      alt={postUser.username}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                      {postUser.username.charAt(0).toUpperCase()}
                    </div>
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
            {(() => {
              const totalComments = (post.commentCount ?? 0) + localCommentCount;
              return totalComments > 0 && (
                <div className="mt-1 text-gray-500">
                  <span title={`${totalComments} comment${totalComments === 1 ? '' : 's'}`}>
                    💬 {totalComments} {totalComments === 1 ? 'reply' : 'replies'}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Contact Form */}
      {showContactForm && (
        <div className="border-t border-gray-200 p-4 bg-gray-50" onClick={(e) => e.stopPropagation()}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your message
          </label>
          <textarea
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            placeholder="Hi! I'm interested in this book..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            rows={3}
          />
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`sendType-${post.id}`}
                checked={sendType === 'public'}
                onChange={() => setSendType('public')}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Send publicly</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`sendType-${post.id}`}
                checked={sendType === 'private'}
                onChange={() => setSendType('private')}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Send privately</span>
            </label>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCancelContact}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!contactMessage.trim() || isSending}
              className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
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

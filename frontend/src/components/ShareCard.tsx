import { useState } from 'react';
import type { Post } from '@booksharepdx/shared';
import { postService } from '../services';
import { useConfirm } from './useConfirm';
import GenreDisplay from './GenreDisplay';

interface ShareCardProps {
  post: Post;
  onUpdate?: () => void;
}

/**
 * ShareCard - Displays a post from the owner's perspective
 * Used on SharePage for managing your own shares
 */
export default function ShareCard({ post, onUpdate }: ShareCardProps) {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [showMenu, setShowMenu] = useState(false);

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
              <GenreDisplay genre={post.book.genre} />
            </p>

            {/* Type Badge */}
            <div className="flex items-center gap-2 mt-2">
              {post.type === 'giveaway' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Give Away
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Exchange
                </span>
              )}
              {post.status === 'archived' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Archived
                </span>
              )}
            </div>

            {/* Notes */}
            {post.notes && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.notes}</p>
            )}

            {/* Interest threads will go here in future */}
          </div>
        </div>
      </div>
    </>
  );
}

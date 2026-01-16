import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Post, User } from '@booksharepdx/shared';
import { userService } from '../services';
import { useUser } from '../contexts/UserContext';
import { setPendingAction } from '../utils/pendingAuth';
import PostCardMenu from './PostCardMenu';
import RequestForm from './RequestForm';
import GenreDisplay from './GenreDisplay';
import Avatar from './Avatar';

interface PostCardProps {
  post: Post;
  distance?: number;
  autoOpenRequest?: boolean;
}

/**
 * PostCard - Displays a post for viewing (not for the owner)
 * Used on BrowsePage and ProfilePage
 */
export default function PostCard({ post, distance, autoOpenRequest }: PostCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [postUser, setPostUser] = useState<User | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    userService.getById(post.userId).then(setPostUser);
  }, [post.userId]);

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
        </div>
      </div>

      {/* Request Form */}
      {showContactForm && (
        <RequestForm
          postId={post.id}
          postUserId={post.userId}
          onCancel={() => setShowContactForm(false)}
          onSuccess={() => setShowContactForm(false)}
        />
      )}
    </div>
  );
}

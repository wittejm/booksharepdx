import { useState, useEffect } from 'react';
import type { Post, User } from '@booksharepdx/shared';
import Modal from '../Modal';
import { postService, userService, messageService } from '../../services';
import { useToast } from '../useToast';
import { useUser, usePost } from '../../hooks/useDataLoader';

interface ExchangeConfirmModalProps {
  open: boolean;
  onClose: () => void;
  post: Post; // The recipient's post (receivingPost)
  currentUserId: string;
}

export default function ExchangeConfirmModal({ open, onClose, post, currentUserId }: ExchangeConfirmModalProps) {
  const [view, setView] = useState<'confirm' | 'decline' | 'offer-different'>('confirm');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declineMessage, setDeclineMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [bookNoLongerAvailable, setBookNoLongerAvailable] = useState(false);
  const [alternativeOption, setAlternativeOption] = useState<'offer-different' | 'accept-gift' | 'cancel'>('offer-different');
  const [myAvailablePosts, setMyAvailablePosts] = useState<Post[]>([]);
  const [selectedAlternativePostId, setSelectedAlternativePostId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Load giving post and initiator user via hooks
  const { post: givingPost } = usePost(
    open && post.agreedExchange ? post.agreedExchange.responderPostId : undefined
  );
  const { user: initiatorUser } = useUser(
    open && post.agreedExchange ? post.agreedExchange.responderUserId : undefined
  );

  useEffect(() => {
    if (!open || !post.agreedExchange) return;

    async function loadExchangeDetails() {
      try {
        // Check if the selected book (current post) is still available
        const currentPostData = await postService.getById(post.id);
        if (currentPostData?.status !== 'agreed_upon') {
          // Book was already given away
          setBookNoLongerAvailable(true);
        }

        // Load my other available posts for alternative offers
        const myPosts = await postService.getByUserId(currentUserId);
        const available = myPosts.filter(p => p.status === 'active');
        setMyAvailablePosts(available);
      } catch (error) {
        console.error('Failed to load exchange details:', error);
        showToast('Failed to load exchange details', 'error');
      }
    }

    loadExchangeDetails();
  }, [open, post, currentUserId]);

  const handleConfirm = async () => {
    if (!post.agreedExchange || !givingPost || !initiatorUser) return;

    setLoading(true);
    try {
      const currentUser = await userService.getById(currentUserId);
      if (!currentUser) throw new Error('Current user not found');

      // Archive both posts
      await postService.update(post.id, {
        status: 'archived',
        archivedAt: Date.now(),
        givenTo: post.agreedExchange.responderUserId,
        agreedExchange: undefined,
      });

      await postService.update(givingPost.id, {
        status: 'archived',
        archivedAt: Date.now(),
        givenTo: currentUserId,
        agreedExchange: undefined,
      });

      // Update stats for both users (trade = increment booksTraded)
      await userService.incrementBooksTraded(post.agreedExchange.responderUserId);
      await userService.incrementBooksTraded(currentUserId);

      // Send completion message
      const thread = await messageService.getOrCreateThread(
        currentUserId,
        post.agreedExchange!.responderUserId,
        givingPost.id
      );

      await messageService.sendMessage({
        threadId: thread.id,
        content: `Exchange Completed\n\n• ${initiatorUser.username} gave: "${givingPost.book.title}" by ${givingPost.book.author}\n• ${currentUser.username} gave: "${post.book.title}" by ${post.book.author}\n\nBoth books marked as exchanged!`,
        type: 'system',
        systemMessageType: 'exchange_completed',
      });

      showToast('Exchange confirmed!', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to confirm exchange:', error);
      showToast('Failed to confirm exchange', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!post.agreedExchange || !givingPost || !initiatorUser || !declineReason) return;

    setLoading(true);
    try {
      const currentUser = await userService.getById(currentUserId);
      if (!currentUser) throw new Error('Current user not found');

      // Return both posts to active status
      await postService.update(post.id, {
        status: 'active',
        agreedExchange: undefined,
      });

      await postService.update(givingPost.id, {
        status: 'active',
        agreedExchange: undefined,
      });

      // Send decline message
      const thread = await messageService.getOrCreateThread(
        currentUserId,
        post.agreedExchange!.responderUserId,
        givingPost.id
      );

      const reasonText = {
        'no-longer-available': 'This book is no longer available',
        'prefer-different': "I'd prefer a different book",
        'changed-mind': 'Changed my mind about exchanging',
        'other': 'Other',
      }[declineReason] || declineReason;

      await messageService.sendMessage({
        threadId: thread.id,
        content: `Exchange Declined\n\n${currentUser.username} declined the exchange for "${post.book.title}"\nReason: ${reasonText}${declineMessage ? '\n\n' + declineMessage : ''}`,
        type: 'system',
        systemMessageType: 'exchange_declined',
      });

      showToast('Exchange declined', 'info');
      onClose();
    } catch (error) {
      console.error('Failed to decline exchange:', error);
      showToast('Failed to decline exchange', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferDifferentBook = async () => {
    if (!selectedAlternativePostId || !post.agreedExchange || !givingPost) return;

    setLoading(true);
    try {
      const alternativePost = myAvailablePosts.find(p => p.id === selectedAlternativePostId);
      if (!alternativePost) throw new Error('Alternative post not found');

      const currentUser = await userService.getById(currentUserId);
      if (!currentUser) throw new Error('Current user not found');

      // Cancel current exchange
      await postService.update(post.id, {
        status: 'active',
        agreedExchange: undefined,
      });

      // Set up new exchange with alternative book
      await postService.update(alternativePost.id, {
        status: 'agreed_upon',
        agreedExchange: {
          responderUserId: currentUserId, // Now sharer becomes responder
          sharerUserId: post.agreedExchange.responderUserId,
          responderPostId: alternativePost.id,
          sharerPostId: givingPost.id,
          timestamp: Date.now(),
        },
      });

      await postService.update(givingPost.id, {
        status: 'agreed_upon',
        agreedExchange: {
          responderUserId: currentUserId,
          sharerUserId: post.agreedExchange.responderUserId,
          responderPostId: alternativePost.id,
          sharerPostId: givingPost.id,
          timestamp: Date.now(),
        },
      });

      // Send system message
      const thread = await messageService.getOrCreateThread(
        currentUserId,
        post.agreedExchange!.responderUserId,
        givingPost.id
      );

      await messageService.sendMessage({
        threadId: thread.id,
        content: `Exchange Updated\n\n${currentUser.username}'s "${post.book.title}" is no longer available.\n${currentUser.username} is offering "${alternativePost.book.title}" instead.\n\nPlease confirm this exchange.`,
        type: 'system',
        systemMessageType: 'exchange_proposed',
      });

      showToast('Alternative book offered', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to offer alternative:', error);
      showToast('Failed to offer alternative book', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAsGift = async () => {
    if (!post.agreedExchange || !givingPost || !initiatorUser) return;

    setLoading(true);
    try {
      const currentUser = await userService.getById(currentUserId);
      if (!currentUser) throw new Error('Current user not found');

      // Archive giving post, return receiving post to active
      await postService.update(post.id, {
        status: 'active',
        agreedExchange: undefined,
      });

      await postService.update(givingPost.id, {
        status: 'archived',
        archivedAt: Date.now(),
        givenTo: currentUserId,
        agreedExchange: undefined,
      });

      // Update stats (only for giving)
      await userService.incrementBooksGiven(post.agreedExchange.responderUserId);

      await userService.update(currentUserId, {
        stats: {
          ...currentUser.stats,
          booksReceived: currentUser.stats.booksReceived + 1,
        },
      });

      // Send completion message
      const thread = await messageService.getOrCreateThread(
        currentUserId,
        post.agreedExchange!.responderUserId,
        givingPost.id
      );

      await messageService.sendMessage({
        threadId: thread.id,
        content: `Gift Completed\n\n${initiatorUser.username} gave "${givingPost.book.title}" to ${currentUser.username} as a gift.`,
        type: 'system',
        systemMessageType: 'gift_completed',
      });

      showToast('Accepted as gift!', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to accept as gift:', error);
      showToast('Failed to accept as gift', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!post.agreedExchange || !givingPost || !initiatorUser) {
    return null;
  }

  // Edge case: Book no longer available
  if (bookNoLongerAvailable && view === 'confirm') {
    return (
      <Modal open={open} onClose={onClose} title="Book No Longer Available" size="md">
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-gray-700 mb-3">
              "{post.book.title}" has already been given away.
            </p>
            <p className="text-gray-700 mb-4">
              {initiatorUser.username} wanted to exchange for this book. What would you like to do?
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer p-3 border rounded-lg hover:border-green-500 transition-colors">
              <input
                type="radio"
                name="alternative"
                checked={alternativeOption === 'offer-different'}
                onChange={() => setAlternativeOption('offer-different')}
                className="mt-1"
              />
              <span className="text-gray-700">Offer a different book</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer p-3 border rounded-lg hover:border-green-500 transition-colors">
              <input
                type="radio"
                name="alternative"
                checked={alternativeOption === 'accept-gift'}
                onChange={() => setAlternativeOption('accept-gift')}
                className="mt-1"
              />
              <span className="text-gray-700">Accept as a gift (no exchange)</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer p-3 border rounded-lg hover:border-green-500 transition-colors">
              <input
                type="radio"
                name="alternative"
                checked={alternativeOption === 'cancel'}
                onChange={() => setAlternativeOption('cancel')}
                className="mt-1"
              />
              <span className="text-gray-700">Cancel this transaction</span>
            </label>
          </div>

          {alternativeOption === 'offer-different' && myAvailablePosts.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Choose a book to offer:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {myAvailablePosts.map(availablePost => (
                  <label
                    key={availablePost.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAlternativePostId === availablePost.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="alternativeBook"
                      value={availablePost.id}
                      checked={selectedAlternativePostId === availablePost.id}
                      onChange={() => setSelectedAlternativePostId(availablePost.id)}
                      className="mt-1"
                    />
                    <div className="flex-grow">
                      <div className="font-medium text-gray-900">"{availablePost.book.title}"</div>
                      <div className="text-sm text-gray-600">{availablePost.book.author}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {availablePost.type === 'exchange' ? 'Exchange' : 'Give Away'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {alternativeOption === 'offer-different' && myAvailablePosts.length === 0 && (
            <div className="mt-4 text-center py-4 text-gray-500 text-sm">
              You don't have any other available books to offer.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (alternativeOption === 'offer-different') {
                  handleOfferDifferentBook();
                } else if (alternativeOption === 'accept-gift') {
                  handleAcceptAsGift();
                } else {
                  handleDecline();
                }
              }}
              disabled={loading || (alternativeOption === 'offer-different' && !selectedAlternativePostId)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Decline view
  if (view === 'decline') {
    return (
      <Modal open={open} onClose={onClose} title="Decline Exchange" size="md">
        <div className="space-y-4">
          <div>
            <p className="text-gray-700 mb-3">Why are you declining?</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="radio"
                  name="reason"
                  value="no-longer-available"
                  checked={declineReason === 'no-longer-available'}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="mt-1"
                />
                <span className="text-gray-700">This book is no longer available</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="radio"
                  name="reason"
                  value="prefer-different"
                  checked={declineReason === 'prefer-different'}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="mt-1"
                />
                <span className="text-gray-700">I'd prefer a different book</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="radio"
                  name="reason"
                  value="changed-mind"
                  checked={declineReason === 'changed-mind'}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="mt-1"
                />
                <span className="text-gray-700">Changed my mind about exchanging</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="radio"
                  name="reason"
                  value="other"
                  checked={declineReason === 'other'}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="mt-1"
                />
                <span className="text-gray-700">Other (will send message)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optional message to {initiatorUser.username}:
            </label>
            <textarea
              value={declineMessage}
              onChange={(e) => setDeclineMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Add a message..."
            />
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              onClick={() => setView('confirm')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={!declineReason || loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Default confirm view
  return (
    <Modal open={open} onClose={onClose} title="Pending Exchange" size="md">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-gray-900 mb-2">
            {initiatorUser.username} (@{initiatorUser.username}) wants to exchange their "{givingPost.book.title}" for your "{post.book.title}"
          </p>
        </div>

        <div className="space-y-3">
          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">They're giving:</p>
            <div className="flex gap-3">
              {givingPost.book.coverImage && (
                <img
                  src={givingPost.book.coverImage}
                  alt={givingPost.book.title}
                  className="w-12 h-16 object-cover rounded"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">"{givingPost.book.title}"</p>
                <p className="text-sm text-gray-600">{givingPost.book.author}</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">You're giving:</p>
            <div className="flex gap-3">
              {post.book.coverImage && (
                <img
                  src={post.book.coverImage}
                  alt={post.book.title}
                  className="w-12 h-16 object-cover rounded"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">"{post.book.title}"</p>
                <p className="text-sm text-gray-600">{post.book.author}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => setView('decline')}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Decline Exchange
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

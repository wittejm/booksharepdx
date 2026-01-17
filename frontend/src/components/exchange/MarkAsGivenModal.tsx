import { useState, useEffect } from 'react';
import type { Post, User } from '@booksharepdx/shared';
import Modal from '../Modal';
import Avatar from '../Avatar';
import { postService, userService, messageService } from '../../services';
import { useToast } from '../useToast';
import { useUser } from '../../contexts/UserContext';
import { formatTimestamp } from '../../utils/time';

interface Interaction {
  userId: string;
  user: User;
  timestamp: number;
  distance: number; // in miles
}

interface MarkAsGivenModalProps {
  open: boolean;
  onClose: () => void;
  post: Post;
  currentUserId: string;
}

export default function MarkAsGivenModal({ open, onClose, post, currentUserId }: MarkAsGivenModalProps) {
  const { currentUser } = useUser();
  const [step, setStep] = useState<1 | 2>(1);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [recipientPosts, setRecipientPosts] = useState<Post[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [giveAwayNoExchange, setGiveAwayNoExchange] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Step 1: Load interactions (users who messaged about this post)
  useEffect(() => {
    if (!open || step !== 1) return;

    async function loadInteractions() {
      try {
        // Get message threads for this post
        const threads = await messageService.getThreads();
        const postThreads = threads.filter(t => t.postId === post.id);

        const interactions: Interaction[] = [];

        for (const thread of postThreads) {
          const otherUserId = thread.participants.find(id => id !== currentUserId);
          if (!otherUserId) continue;

          const user = await userService.getById(otherUserId);
          if (!user) continue;

          const messages = await messageService.getMessages(thread.id);
          const lastMessage = messages[messages.length - 1];

          interactions.push({
            userId: otherUserId,
            user,
            timestamp: lastMessage?.timestamp || thread.lastMessageAt,
            distance: calculateDistance(user),
          });
        }

        // Sort by most recent interaction
        interactions.sort((a, b) => b.timestamp - a.timestamp);
        setInteractions(interactions);
      } catch (error) {
        console.error('Failed to load interactions:', error);
        showToast('Failed to load recipients', 'error');
      }
    }

    loadInteractions();
  }, [open, step, post.id, currentUserId]);

  // Step 2: Load recipient's posts
  useEffect(() => {
    if (!open || step !== 2 || !selectedRecipient) return;

    async function loadRecipientPosts() {
      if (!selectedRecipient) return;
      try {
        const allPosts = await postService.getByUserId(selectedRecipient.id);
        const activePosts = allPosts.filter(p => p.status === 'active');
        setRecipientPosts(activePosts);
      } catch (error) {
        console.error('Failed to load recipient posts:', error);
        showToast('Failed to load recipient books', 'error');
      }
    }

    loadRecipientPosts();
  }, [open, step, selectedRecipient]);

  const handleSelectRecipient = (interaction: Interaction) => {
    setSelectedRecipient(interaction.user);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedRecipient(null);
    setSelectedBookId(null);
    setGiveAwayNoExchange(false);
  };

  const handleConfirm = async () => {
    if (!selectedRecipient) return;

    setLoading(true);
    try {
      const isExchange = post.type === 'exchange' && selectedBookId && !giveAwayNoExchange;

      if (isExchange) {
        // Exchange flow - set both posts to agreed_upon
        const receivingPost = recipientPosts.find(p => p.id === selectedBookId);
        if (!receivingPost) throw new Error('Selected book not found');

        // Update this post to agreed_upon
        await postService.update(post.id, {
          status: 'agreed_upon',
          pendingExchange: {
            initiatorUserId: currentUserId,
            recipientUserId: selectedRecipient.id,
            givingPostId: post.id,
            receivingPostId: receivingPost.id,
            timestamp: Date.now(),
          },
        });

        // Update recipient's post to agreed_upon
        await postService.update(receivingPost.id, {
          status: 'agreed_upon',
          pendingExchange: {
            initiatorUserId: currentUserId,
            recipientUserId: selectedRecipient.id,
            givingPostId: post.id,
            receivingPostId: receivingPost.id,
            timestamp: Date.now(),
          },
        });

        // Create system message in thread
        const thread = await messageService.getOrCreateThread(
          currentUserId,
          selectedRecipient.id,
          post.id
        );

        await messageService.sendMessage({
          threadId: thread.id,
          content: `Exchange proposed:\n• Give: "${post.book.title}" by ${post.book.author}\n• Receive: "${receivingPost.book.title}" by ${receivingPost.book.author}\n\n${selectedRecipient.username}, please confirm this exchange.`,
          type: 'system',
          systemMessageType: 'exchange_proposed',
        });

        showToast('Exchange initiated with ' + selectedRecipient.username, 'success');
      } else {
        // Gift flow - archive immediately and update stats
        await postService.update(post.id, {
          status: 'archived',
          archivedAt: Date.now(),
          givenTo: selectedRecipient.id,
        });

        // Update stats
        await userService.incrementBooksGiven(currentUserId);

        await userService.incrementBooksReceived(selectedRecipient.id);

        // Create system message in thread
        const thread = await messageService.getOrCreateThread(
          currentUserId,
          selectedRecipient.id,
          post.id
        );

        await messageService.sendMessage({
          threadId: thread.id,
          content: `Gift completed\n\n${currentUser?.username || 'User'} gave "${post.book.title}" to ${selectedRecipient.username} as a gift.`,
          type: 'system',
          systemMessageType: 'gift_completed',
        });

        showToast('Gift completed!', 'success');
      }

      onClose();
      // Reset state
      setTimeout(() => {
        setStep(1);
        setSelectedRecipient(null);
        setSelectedBookId(null);
        setGiveAwayNoExchange(false);
      }, 300);
    } catch (error) {
      console.error('Failed to mark as given:', error);
      showToast('Failed to complete action', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (user: User): number => {
    // Mock distance calculation - in real app would use geolocation
    return Math.random() * 3 + 0.1;
  };


  if (step === 1) {
    return (
      <Modal open={open} onClose={onClose} title={`Mark "${post.book.title}" as Given`} size="md">
        <div className="space-y-4">
          <p className="text-gray-700">Who did you give this book to?</p>

          {interactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No one has messaged about this post yet.</p>
              <p className="text-sm mt-2">You can still mark it as given to someone outside the app.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {interactions.map(interaction => (
                <button
                  key={interaction.userId}
                  onClick={() => handleSelectRecipient(interaction)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    <Avatar src={interaction.user.profilePicture} username={interaction.user.username} size="lg" />
                  </div>
                  <div className="flex-grow">
                    <div className="font-medium text-gray-900">
                      {interaction.user.username} - {interaction.distance.toFixed(1)} mi
                    </div>
                    <div className="text-sm text-gray-500">
                      Messaged {formatTimestamp(interaction.timestamp)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Step 2
  const isExchangePost = post.type === 'exchange';
  const hasAvailableBooks = recipientPosts.length > 0;
  const canConfirm = selectedBookId || giveAwayNoExchange;

  return (
    <Modal open={open} onClose={onClose} title={`Complete ${isExchangePost ? 'Exchange' : 'Gift'} with ${selectedRecipient?.username}`} size="md">
      <div className="space-y-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">You're giving:</p>
          <p className="font-medium text-gray-900">"{post.book.title}"</p>
        </div>

        {isExchangePost && (
          <>
            {hasAvailableBooks ? (
              <>
                <div>
                  <p className="text-gray-700 mb-3">
                    What book are you receiving from {selectedRecipient?.username} in exchange?
                  </p>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {selectedRecipient?.username}'s Available Books:
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recipientPosts.map(recipientPost => (
                      <label
                        key={recipientPost.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedBookId === recipientPost.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${giveAwayNoExchange ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="selectedBook"
                          value={recipientPost.id}
                          checked={selectedBookId === recipientPost.id}
                          onChange={() => {
                            if (!giveAwayNoExchange) {
                              setSelectedBookId(recipientPost.id);
                            }
                          }}
                          disabled={giveAwayNoExchange}
                          className="mt-1"
                        />
                        <div className="flex-grow">
                          {recipientPost.book.coverImage && (
                            <img
                              src={recipientPost.book.coverImage}
                              alt={recipientPost.book.title}
                              className="w-12 h-16 object-cover rounded mb-2"
                            />
                          )}
                          <div className="font-medium text-gray-900">"{recipientPost.book.title}"</div>
                          <div className="text-sm text-gray-600">{recipientPost.book.author}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {recipientPost.type === 'exchange' ? 'Exchange' : 'Give Away'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={giveAwayNoExchange}
                      onChange={(e) => {
                        setGiveAwayNoExchange(e.target.checked);
                        if (e.target.checked) {
                          setSelectedBookId(null);
                        }
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">I gave this away (no exchange)</span>
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">
                    {selectedRecipient?.username} doesn't have any available books right now.
                  </p>
                  <p className="text-sm text-gray-600 mb-3">Options:</p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="noBookOption"
                        checked={giveAwayNoExchange}
                        onChange={() => setGiveAwayNoExchange(true)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">Give away (no exchange)</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {!isExchangePost && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">This will:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Archive this post</li>
              <li>Add to your Given count (+1)</li>
              <li>Add to {selectedRecipient?.username}'s Received count (+1)</li>
            </ul>
          </div>
        )}

        {isExchangePost && giveAwayNoExchange && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-2">Confirm Gift</p>
            <p className="text-sm text-gray-700 mb-3">
              You posted this as "Exchange" but you're giving it away without receiving a book.
            </p>
            <p className="text-sm text-gray-600 mb-2">This will:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Archive this post</li>
              <li>Add to your Given count (+1)</li>
              <li>Add to {selectedRecipient?.username}'s Received count (+1)</li>
              <li>No book received for you</li>
            </ul>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4 border-t">
          <button
            onClick={handleBack}
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
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

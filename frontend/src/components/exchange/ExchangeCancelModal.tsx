import { useState } from 'react';
import type { Post } from '@booksharepdx/shared';
import Modal from '../Modal';
import { postService, messageService, userService } from '../../services';
import { useToast } from '../useToast';

interface ExchangeCancelModalProps {
  open: boolean;
  onClose: () => void;
  post: Post; // The post with pending exchange
  currentUserId: string;
}

export default function ExchangeCancelModal({ open, onClose, post, currentUserId }: ExchangeCancelModalProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleCancel = async () => {
    if (!post.pendingExchange) return;

    setLoading(true);
    try {
      const currentUser = await userService.getById(currentUserId);
      if (!currentUser) throw new Error('Current user not found');

      // Return both posts to active status
      await postService.update(post.id, {
        status: 'active',
        pendingExchange: undefined,
      });

      const otherPostId = post.id === post.pendingExchange.givingPostId
        ? post.pendingExchange.receivingPostId
        : post.pendingExchange.givingPostId;

      await postService.update(otherPostId, {
        status: 'active',
        pendingExchange: undefined,
      });

      // Send cancellation message
      const otherUserId = post.pendingExchange.initiatorUserId === currentUserId
        ? post.pendingExchange.recipientUserId
        : post.pendingExchange.initiatorUserId;

      const thread = await messageService.getOrCreateThread(
        currentUserId,
        otherUserId,
        post.pendingExchange.givingPostId
      );

      await messageService.sendMessage({
        threadId: thread.id,
        content: `Exchange Cancelled\n\n${currentUser.username} cancelled the pending exchange.`,
        type: 'system',
        systemMessageType: 'exchange_cancelled',
      });

      showToast('Exchange cancelled', 'info');
      onClose();
    } catch (error) {
      console.error('Failed to cancel exchange:', error);
      showToast('Failed to cancel exchange', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!post.pendingExchange) return null;

  return (
    <Modal open={open} onClose={onClose} title="Cancel Exchange?" size="sm">
      <div className="space-y-4">
        <p className="text-gray-700">
          This will cancel the pending exchange.
        </p>

        <p className="text-gray-700">
          Your post will return to active and you can mark it as given to someone else.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Cancelling...' : 'Cancel Exchange'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

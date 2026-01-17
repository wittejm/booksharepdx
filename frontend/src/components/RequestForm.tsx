import { useState } from 'react';
import type { MessageThread } from '@booksharepdx/shared';
import { messageService } from '../services';
import { useUser } from '../contexts/UserContext';

interface RequestFormProps {
  postId: string;
  postUserId: string;
  onCancel: () => void;
  onSuccess: (thread: MessageThread) => void;
}

/**
 * RequestForm - Form for sending a message to request a book
 * Messages are private (sent to MessageThread)
 */
export default function RequestForm({ postId, postUserId, onCancel, onSuccess }: RequestFormProps) {
  const { currentUser } = useUser();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || !message.trim()) return;

    setIsSending(true);
    try {
      const thread = await messageService.getOrCreateThread(currentUser.id, postUserId, postId);
      await messageService.sendMessage({
        threadId: thread.id,
        content: message.trim(),
      });
      setMessage('');
      onSuccess(thread);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMessage('');
    onCancel();
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50" onClick={(e) => e.stopPropagation()}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Your message
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Hi! I'm interested in this book..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        rows={3}
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isSending}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

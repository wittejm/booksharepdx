import { useState } from 'react';
import Modal from './Modal';
import { useToast } from './useToast';
import { blockService } from '../services/dataService';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetPostId?: string;
  onSubmit: (reasons: string[], details?: string, includeMessageHistory?: boolean) => void | Promise<void>;
  isFromConversation?: boolean;
}

export default function ReportModal({
  open,
  onClose,
  targetUserId,
  onSubmit,
  isFromConversation = false,
}: ReportModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [includeMessageHistory, setIncludeMessageHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false);
  const { error } = useToast();

  const reasons = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'scam', label: 'Scam' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'other', label: 'Other' },
  ];

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedReasons.length === 0) {
      error('Please select at least one reason');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(selectedReasons, details || undefined, includeMessageHistory);
      setShowBlockConfirmation(true);
    } catch (err) {
      error('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockAndClose = async () => {
    try {
      await blockService.block(targetUserId, targetUserId);
      resetForm();
      onClose();
    } catch (err) {
      error('Failed to block user');
    }
  };

  const resetForm = () => {
    setSelectedReasons([]);
    setDetails('');
    setIncludeMessageHistory(false);
    setShowBlockConfirmation(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (showBlockConfirmation) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Block This User?"
        showCloseButton
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Would you like to block this user? They won't be able to message or interact with you.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Skip
            </button>
            <button
              onClick={handleBlockAndClose}
              className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium"
            >
              Block User
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Report User"
      showCloseButton
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Reason Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Reason for report <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {reasons.map((reason) => (
              <label key={reason.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReasons.includes(reason.value)}
                  onChange={() => toggleReason(reason.value)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-700">{reason.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <label htmlFor="details" className="block text-sm font-medium text-gray-900 mb-2">
            Additional details <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Provide any additional context that helps us understand the issue..."
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">Max 500 characters</p>
        </div>

        {/* Include Message History */}
        {isFromConversation && (
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMessageHistory}
                onChange={(e) => setIncludeMessageHistory(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                Include message history from this conversation
              </span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || selectedReasons.length === 0}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

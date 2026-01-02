import { useRef, useEffect, useState } from 'react';
import { MoreVertical, Shield, Flag } from 'lucide-react';
import { blockService, reportService } from '../services';
import { useToast } from './useToast';
import ReportModal from './ReportModal';

interface BlockReportMenuProps {
  targetUserId: string;
  targetPostId?: string;
  currentUserId: string;
}

export default function BlockReportMenu({
  targetUserId,
  targetPostId,
  currentUserId,
}: BlockReportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

  // Check if user is already blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      const blocked = await blockService.isBlocked(currentUserId, targetUserId);
      setIsBlocked(blocked);
    };
    checkBlockStatus();
  }, [currentUserId, targetUserId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const handleBlockUser = async () => {
    try {
      if (isBlocked) {
        await blockService.unblock(currentUserId, targetUserId);
        setIsBlocked(false);
        success('User unblocked');
      } else {
        await blockService.block(currentUserId, targetUserId);
        setIsBlocked(true);
        success('User blocked');
      }
      setIsOpen(false);
    } catch (err) {
      error('Failed to update block status');
    }
  };

  const handleReportClick = () => {
    setIsReportModalOpen(true);
    setIsOpen(false);
  };

  const handleReportSubmit = async (
    reasons: string[],
    details?: string,
    includeMessageHistory?: boolean
  ) => {
    try {
      await reportService.create({
        reporterId: currentUserId,
        reportedUserId: targetUserId,
        reportedPostId: targetPostId,
        reasons: reasons as ('spam' | 'harassment' | 'scam' | 'inappropriate' | 'other')[],
        details,
        includeMessageHistory,
      });
      success('Report submitted successfully');
      setIsReportModalOpen(false);
    } catch (err) {
      error('Failed to submit report');
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
          aria-expanded={isOpen}
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fade-in">
            <button
              onClick={handleBlockUser}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-gray-700 first:rounded-t-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm">{isBlocked ? 'Unblock User' : 'Block User'}</span>
            </button>
            <button
              onClick={handleReportClick}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-gray-700 last:rounded-b-lg transition-colors border-t border-gray-100"
            >
              <Flag className="w-4 h-4" />
              <span className="text-sm">Report User</span>
            </button>
          </div>
        )}
      </div>

      <ReportModal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetUserId={targetUserId}
        targetPostId={targetPostId}
        onSubmit={handleReportSubmit}
        isFromConversation={!!targetPostId}
      />
    </>
  );
}

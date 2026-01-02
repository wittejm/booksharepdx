import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  FileText,
  TrendingUp,
  Filter,
  X,
  MessageSquare,
  Ban,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Report, User as UserType, Post, Comment, ModerationAction } from '@booksharepdx/shared';
import { useUser } from '../contexts/UserContext';
import {
  reportService,
  userService,
  postService,
  commentService,
  moderationActionService,
  notificationService,
} from '../services';
import { useToast } from '../components/useToast';
import LoadingSpinner from '../components/LoadingSpinner';
import ToastContainer from '../components/ToastContainer';

type TabType = 'new' | 'in_review' | 'resolved';

interface ReportWithDetails extends Report {
  reporter?: UserType;
  reportedUser?: UserType;
  reportedPost?: Post;
  reportedComment?: Comment;
}

interface ModerationActionWithDetails extends ModerationAction {
  moderator?: UserType;
  targetUser?: UserType;
}

// Moderator message templates
const WARNING_TEMPLATES = {
  spam: 'Your recent activity has been flagged as spam. Please ensure all your posts and comments are genuine and contribute to the community.',
  harassment: 'Your behavior has been reported as harassment. Please treat all community members with respect. Further violations may result in suspension.',
  scam: 'Your activity has been flagged as potentially fraudulent. Please ensure all exchanges are genuine and honest.',
  inappropriate: 'Your content has been flagged as inappropriate. Please review our community guidelines and ensure future posts comply with our standards.',
  general: 'Your activity has been flagged by our moderation team. Please review our community guidelines.',
};

const SUSPENSION_TEMPLATES = {
  1: 'Your account has been suspended for 1 day due to violations of our community guidelines.',
  7: 'Your account has been suspended for 7 days due to repeated violations of our community guidelines.',
  30: 'Your account has been suspended for 30 days due to serious violations of our community guidelines.',
};

export default function ModerationPage() {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [moderationActions, setModerationActions] = useState<ModerationActionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');
  const { toasts, success, error, dismiss } = useToast();

  // Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allReports = await reportService.getAll();
      const allActions = await moderationActionService.getAll();

      // Enrich reports with user/content details
      const enrichedReports = await Promise.all(
        allReports.map(async (report) => {
          const enriched: ReportWithDetails = { ...report };

          if (report.reporterId) {
            enriched.reporter = (await userService.getById(report.reporterId)) || undefined;
          }
          if (report.reportedUserId) {
            enriched.reportedUser = (await userService.getById(report.reportedUserId)) || undefined;
          }
          if (report.reportedPostId) {
            enriched.reportedPost = (await postService.getById(report.reportedPostId)) || undefined;
          }
          if (report.reportedCommentId) {
            enriched.reportedComment = (await commentService.getById(report.reportedCommentId)) || undefined;
          }

          return enriched;
        })
      );

      // Enrich moderation actions with user details
      const enrichedActions = await Promise.all(
        allActions.map(async (action) => {
          const enriched: ModerationActionWithDetails = { ...action };
          enriched.moderator = (await userService.getById(action.moderatorId)) || undefined;
          enriched.targetUser = (await userService.getById(action.targetUserId)) || undefined;
          return enriched;
        })
      );

      setReports(enrichedReports.sort((a, b) => b.timestamp - a.timestamp));
      setModerationActions(enrichedActions.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => r.status === activeTab);
  }, [reports, activeTab]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const allUsers = await userService.getAll();
    const results = allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleClaimReport = async (reportId: string) => {
    if (!currentUser) return;

    try {
      await reportService.update(reportId, {
        status: 'in_review',
        claimedBy: currentUser.id,
      });
      await loadData();
      success('Report claimed successfully');
    } catch (err) {
      error('Failed to claim report');
    }
  };

  const handleOpenReviewModal = (report: ReportWithDetails) => {
    setSelectedReport(report);
    setShowReviewModal(true);
    setInternalNote('');
    setCustomReason('');
  };

  const handleDismissReport = async () => {
    if (!selectedReport || !currentUser) return;

    try {
      await reportService.update(selectedReport.id, {
        status: 'resolved',
        resolution: {
          action: 'dismissed',
          moderatorId: currentUser.id,
          reason: customReason || 'Report reviewed and dismissed - no action needed.',
          timestamp: Date.now(),
        },
      });

      // Notify reporter
      if (selectedReport.reporterId) {
        await notificationService.create({
          userId: selectedReport.reporterId,
          type: 'moderator_action',
          content: 'Your report has been reviewed. No action was required.',
        });
      }

      await loadData();
      setShowReviewModal(false);
      success('Report dismissed');
    } catch (err) {
      error('Failed to dismiss report');
    }
  };

  const handleWarnUser = async () => {
    if (!selectedReport || !currentUser || !selectedReport.reportedUserId) return;

    try {
      const reason = selectedReport.reasons[0] || 'general';
      const warningMessage = WARNING_TEMPLATES[reason as keyof typeof WARNING_TEMPLATES] || WARNING_TEMPLATES.general;

      await moderationActionService.create({
        moderatorId: currentUser.id,
        targetUserId: selectedReport.reportedUserId,
        action: 'warning',
        reason: customReason || warningMessage,
      });

      await reportService.update(selectedReport.id, {
        status: 'resolved',
        resolution: {
          action: 'warned',
          moderatorId: currentUser.id,
          reason: customReason || warningMessage,
          timestamp: Date.now(),
        },
      });

      // Notify reported user
      await notificationService.create({
        userId: selectedReport.reportedUserId,
        type: 'moderator_action',
        content: `Warning: ${customReason || warningMessage}`,
      });

      // Notify reporter
      if (selectedReport.reporterId) {
        await notificationService.create({
          userId: selectedReport.reporterId,
          type: 'moderator_action',
          content: 'Your report has been reviewed. The user has been warned.',
        });
      }

      await loadData();
      setShowReviewModal(false);
      success('User warned successfully');
    } catch (err) {
      error('Failed to warn user');
    }
  };

  const handleRemoveContent = async () => {
    if (!selectedReport || !currentUser) return;

    try {
      let contentType = '';
      let contentId = '';

      if (selectedReport.reportedPostId) {
        await postService.update(selectedReport.reportedPostId, { status: 'archived' });
        contentType = 'post';
        contentId = selectedReport.reportedPostId;
      } else if (selectedReport.reportedCommentId) {
        await commentService.delete(selectedReport.reportedCommentId);
        contentType = 'comment';
        contentId = selectedReport.reportedCommentId;
      }

      if (selectedReport.reportedUserId) {
        await moderationActionService.create({
          moderatorId: currentUser.id,
          targetUserId: selectedReport.reportedUserId,
          action: 'content_removed',
          reason: customReason || `Content removed for violating community guidelines.`,
          targetContentId: contentId,
        });

        // Notify reported user
        await notificationService.create({
          userId: selectedReport.reportedUserId,
          type: 'moderator_action',
          content: `Your ${contentType} has been removed for violating community guidelines.`,
        });
      }

      await reportService.update(selectedReport.id, {
        status: 'resolved',
        resolution: {
          action: 'content_removed',
          moderatorId: currentUser.id,
          reason: customReason || 'Content removed for violating community guidelines.',
          timestamp: Date.now(),
        },
      });

      // Notify reporter
      if (selectedReport.reporterId) {
        await notificationService.create({
          userId: selectedReport.reporterId,
          type: 'moderator_action',
          content: 'Your report has been reviewed. The content has been removed.',
        });
      }

      await loadData();
      setShowReviewModal(false);
      success('Content removed successfully');
    } catch (err) {
      error('Failed to remove content');
    }
  };

  const handleSuspendUser = async (days: 1 | 7 | 30) => {
    if (!selectedReport || !currentUser || !selectedReport.reportedUserId) return;

    try {
      const suspensionEnd = Date.now() + days * 24 * 60 * 60 * 1000;
      const suspensionMessage = SUSPENSION_TEMPLATES[days];

      await userService.update(selectedReport.reportedUserId, {
        suspended: {
          until: suspensionEnd,
          reason: customReason || suspensionMessage,
        },
      });

      await moderationActionService.create({
        moderatorId: currentUser.id,
        targetUserId: selectedReport.reportedUserId,
        action: 'suspended',
        reason: customReason || suspensionMessage,
        suspensionDuration: days,
      });

      await reportService.update(selectedReport.id, {
        status: 'resolved',
        resolution: {
          action: 'suspended',
          moderatorId: currentUser.id,
          reason: customReason || suspensionMessage,
          timestamp: Date.now(),
        },
      });

      // Notify reported user
      await notificationService.create({
        userId: selectedReport.reportedUserId,
        type: 'moderator_action',
        content: customReason || suspensionMessage,
      });

      // Notify reporter
      if (selectedReport.reporterId) {
        await notificationService.create({
          userId: selectedReport.reporterId,
          type: 'moderator_action',
          content: `Your report has been reviewed. The user has been suspended for ${days} day${days > 1 ? 's' : ''}.`,
        });
      }

      await loadData();
      setShowReviewModal(false);
      success(`User suspended for ${days} day${days > 1 ? 's' : ''}`);
    } catch (err) {
      error('Failed to suspend user');
    }
  };

  const handleEscalate = async () => {
    if (!selectedReport || !currentUser) return;

    try {
      await reportService.update(selectedReport.id, {
        status: 'resolved',
        resolution: {
          action: 'escalated',
          moderatorId: currentUser.id,
          reason: customReason || 'Escalated to admin for review.',
          timestamp: Date.now(),
        },
      });

      await loadData();
      setShowReviewModal(false);
      success('Report escalated to admin');
    } catch (err) {
      error('Failed to escalate report');
    }
  };

  const filteredActions = useMemo(() => {
    if (filterAction === 'all') return moderationActions;
    return moderationActions.filter((a) => a.action === filterAction);
  }, [moderationActions, filterAction]);

  // Statistics calculations
  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const reportsThisWeek = reports.filter((r) => r.timestamp >= weekAgo).length;
    const reportsThisMonth = reports.filter((r) => r.timestamp >= monthAgo).length;

    const resolvedReports = reports.filter((r) => r.status === 'resolved' && r.resolution);
    const avgResponseTime =
      resolvedReports.length > 0
        ? resolvedReports.reduce((acc, r) => {
            if (r.resolution) {
              return acc + (r.resolution.timestamp - r.timestamp);
            }
            return acc;
          }, 0) / resolvedReports.length
        : 0;

    const actionCounts = {
      dismissed: reports.filter((r) => r.resolution?.action === 'dismissed').length,
      warned: reports.filter((r) => r.resolution?.action === 'warned').length,
      content_removed: reports.filter((r) => r.resolution?.action === 'content_removed').length,
      suspended: reports.filter((r) => r.resolution?.action === 'suspended').length,
      escalated: reports.filter((r) => r.resolution?.action === 'escalated').length,
    };

    return {
      reportsThisWeek,
      reportsThisMonth,
      avgResponseTime: avgResponseTime / (1000 * 60 * 60), // Convert to hours
      actionCounts,
    };
  }, [reports]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUserModerationHistory = async (userId: string) => {
    const actions = await moderationActionService.getByUserId(userId);
    const userReports = reports.filter((r) => r.reportedUserId === userId);
    return { actions, reports: userReports };
  };

  const [userHistory, setUserHistory] = useState<{
    actions: ModerationAction[];
    reports: ReportWithDetails[];
  } | null>(null);

  const handleViewUserHistory = async (userId: string) => {
    const history = await getUserModerationHistory(userId);
    setUserHistory(history);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Moderation Dashboard</h1>
        </div>
        <p className="text-gray-600">Manage reports, review content, and maintain community standards</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.reportsThisWeek}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.reportsThisMonth}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgResponseTime > 0 ? `${stats.avgResponseTime.toFixed(1)}h` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Actions</p>
              <p className="text-2xl font-bold text-gray-900">{moderationActions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Reports Queue */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reports Queue</h2>

              {/* Tab Navigation */}
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'new'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    New ({reports.filter((r) => r.status === 'new').length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('in_review')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'in_review'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    In Review ({reports.filter((r) => r.status === 'in_review').length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('resolved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'resolved'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Resolved ({reports.filter((r) => r.status === 'resolved').length})
                  </div>
                </button>
              </div>
            </div>

            {/* Reports List */}
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredReports.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No reports in this category</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleOpenReviewModal(report)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {report.reporter?.username || 'Unknown'}
                          </span>
                          <span className="text-gray-400">reported</span>
                          <span className="text-sm font-medium text-gray-900">
                            {report.reportedUser?.username || 'Unknown'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {report.reasons.map((reason) => (
                            <span
                              key={reason}
                              className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>

                        {report.details && (
                          <p className="text-sm text-gray-600 line-clamp-2">{report.details}</p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatTimestamp(report.timestamp)}</span>
                          {report.reportedPostId && <span>Post Report</span>}
                          {report.reportedCommentId && <span>Comment Report</span>}
                          {report.claimedBy && (
                            <span className="text-blue-600">
                              Claimed by {reports.find((r) => r.id === report.id)?.reporter?.username}
                            </span>
                          )}
                        </div>
                      </div>

                      {activeTab === 'new' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaimReport(report.id);
                          }}
                          className="btn-secondary text-sm whitespace-nowrap"
                        >
                          Claim
                        </button>
                      )}

                      {activeTab === 'resolved' && report.resolution && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded whitespace-nowrap">
                          {report.resolution.action}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Moderator Activity Log */}
          <div className="card mt-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Moderator Activity Log</h2>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="input text-sm py-1"
                  >
                    <option value="all">All Actions</option>
                    <option value="warning">Warnings</option>
                    <option value="content_removed">Content Removed</option>
                    <option value="suspended">Suspensions</option>
                    <option value="banned">Bans</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {filteredActions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No moderation actions yet</p>
                </div>
              ) : (
                filteredActions.map((action) => (
                  <div key={action.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          action.action === 'warning'
                            ? 'bg-yellow-100'
                            : action.action === 'content_removed'
                            ? 'bg-orange-100'
                            : action.action === 'suspended'
                            ? 'bg-red-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{action.moderator?.username || 'Unknown'}</span>
                          {' '}
                          {action.action === 'warning' && 'warned'}
                          {action.action === 'content_removed' && 'removed content from'}
                          {action.action === 'suspended' && 'suspended'}
                          {action.action === 'banned' && 'banned'}
                          {' '}
                          <span className="font-medium">{action.targetUser?.username || 'Unknown'}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{action.reason}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(action.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - User Lookup & Stats */}
        <div className="space-y-6">
          {/* User Lookup */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Lookup</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username or email"
                className="input flex-1"
              />
              <button onClick={handleSearch} className="btn-primary">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={async () => {
                      setSelectedUser(user);
                      await handleViewUserHistory(user.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.role === 'moderator' && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Mod</span>
                        )}
                        {user.role === 'admin' && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">Admin</span>
                        )}
                        {user.suspended && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Suspended</span>
                        )}
                        {user.banned && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Banned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedUser && userHistory && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Moderation History</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Actions Against User</p>
                    <p className="text-2xl font-bold text-gray-900">{userHistory.actions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reports Filed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reports.filter((r) => r.reporterId === selectedUser.id).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reports Against User</p>
                    <p className="text-2xl font-bold text-gray-900">{userHistory.reports.length}</p>
                  </div>
                </div>

                {userHistory.actions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Recent Actions</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {userHistory.actions.slice(0, 5).map((action) => (
                        <div key={action.id} className="text-xs p-2 bg-gray-50 rounded">
                          <p className="font-medium">
                            {action.action.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-gray-600 mt-1">{action.reason}</p>
                          <p className="text-gray-500 mt-1">{formatTimestamp(action.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions Breakdown */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Dismissed</span>
                <span className="font-semibold text-gray-900">{stats.actionCounts.dismissed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Warned</span>
                <span className="font-semibold text-gray-900">{stats.actionCounts.warned}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Content Removed</span>
                <span className="font-semibold text-gray-900">{stats.actionCounts.content_removed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Suspended</span>
                <span className="font-semibold text-gray-900">{stats.actionCounts.suspended}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Escalated</span>
                <span className="font-semibold text-gray-900">{stats.actionCounts.escalated}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Review Report</h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Report Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reporter:</span>
                    <span className="font-medium">{selectedReport.reporter?.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reported User:</span>
                    <span className="font-medium">{selectedReport.reportedUser?.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Timestamp:</span>
                    <span className="font-medium">{new Date(selectedReport.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-600">Reasons:</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {selectedReport.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedReport.details && (
                    <div>
                      <span className="text-sm text-gray-600 block mb-1">Details:</span>
                      <p className="text-sm text-gray-900">{selectedReport.details}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reported Content */}
              {(selectedReport.reportedPost || selectedReport.reportedComment) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Reported Content</h3>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    {selectedReport.reportedPost && (
                      <div>
                        <p className="font-medium text-gray-900 mb-2">
                          {selectedReport.reportedPost.book.title}
                        </p>
                        <p className="text-sm text-gray-600">by {selectedReport.reportedPost.book.author}</p>
                        {selectedReport.reportedPost.notes && (
                          <p className="text-sm text-gray-700 mt-2">{selectedReport.reportedPost.notes}</p>
                        )}
                      </div>
                    )}
                    {selectedReport.reportedComment && (
                      <div>
                        <p className="text-sm text-gray-900">{selectedReport.reportedComment.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User History */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">User Moderation History</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Previous actions against this user:{' '}
                    <span className="font-semibold">
                      {moderationActions.filter((a) => a.targetUserId === selectedReport.reportedUserId).length}
                    </span>
                  </p>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (optional)
                </label>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add notes for other moderators..."
                  className="input min-h-[80px]"
                />
              </div>

              {/* Custom Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Reason (optional)
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason for action..."
                  className="input"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900">Take Action</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleDismissReport}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Dismiss Report
                  </button>

                  <button
                    onClick={handleWarnUser}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Warn User
                  </button>

                  <button
                    onClick={handleRemoveContent}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Remove Content
                  </button>

                  <button
                    onClick={() => handleSuspendUser(1)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend 1 Day
                  </button>

                  <button
                    onClick={() => handleSuspendUser(7)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend 7 Days
                  </button>

                  <button
                    onClick={() => handleSuspendUser(30)}
                    className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend 30 Days
                  </button>

                  <button
                    onClick={handleEscalate}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 sm:col-span-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Escalate to Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

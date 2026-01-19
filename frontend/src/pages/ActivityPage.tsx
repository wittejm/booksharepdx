import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import type { MessageThread, Message, Post, User, MessageThreadStatus } from '@booksharepdx/shared';
import { messageService, postService, userService, vouchService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/useToast';
import { useConfirm } from '../components/useConfirm';
import ToastContainer from '../components/ToastContainer';
import { formatTimestamp } from '../utils/time';
import { ERROR_MESSAGES } from '../utils/errorMessages';

export default function ActivityPage() {
  const { threadId } = useParams<{ threadId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const highlightPostId = searchParams.get('postId');

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const { showToast, toasts, dismiss } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // Thread data cache
  const [threadPosts, setThreadPosts] = useState<{ [threadId: string]: Post }>({});
  const [threadUsers, setThreadUsers] = useState<{ [threadId: string]: User }>({});

  // Trade proposal post cache (for rendering proposal cards)
  const [proposalPosts, setProposalPosts] = useState<{ [postId: string]: Post }>({});
  const [respondingToProposal, setRespondingToProposal] = useState(false);

  // Mobile view state
  const [showConversation, setShowConversation] = useState(false);

  // Vouch state - Vouch is a non-MVP feature
  const [canVouch, setCanVouch] = useState(false);
  const [hasVouched, setHasVouched] = useState(false);
  const [vouchLoading, setVouchLoading] = useState(false);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [currentUser]);

  // Load posts for trade_proposal messages (to render proposal cards)
  // IMPORTANT - Trade proposal field semantics:
  //   - offeredPostId = the POSTER's book (what they're giving away)
  //   - requestedPostId = the REQUESTER's book (what the poster SELECTED/WANTS)
  // We display requestedPostId because that's the book the poster chose from the requester's collection
  useEffect(() => {
    const loadProposalPostsData = async () => {
      const tradeProposals = messages.filter(m => m.type === 'trade_proposal');
      const postIdsToLoad = new Set<string>();

      tradeProposals.forEach(proposal => {
        // Load the REQUESTED post (the book the poster selected from the requester)
        if (proposal.requestedPostId && !proposalPosts[proposal.requestedPostId]) {
          postIdsToLoad.add(proposal.requestedPostId);
        }
      });

      if (postIdsToLoad.size === 0) return;

      const loadedPosts: { [postId: string]: Post } = {};
      await Promise.all(
        Array.from(postIdsToLoad).map(async (postId) => {
          const post = await postService.getById(postId);
          if (post) loadedPosts[postId] = post;
        })
      );

      setProposalPosts(prev => ({ ...prev, ...loadedPosts }));
    };

    loadProposalPostsData();
  }, [messages]);

  // Load thread from URL parameter
  useEffect(() => {
    if (threadId && threads.length > 0) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        selectThread(thread);
        setShowConversation(true);
      }
    }
  }, [threadId, threads]);

  // Load thread from postId query parameter (for navigation from ShareCard trading badge)
  useEffect(() => {
    if (highlightPostId && threads.length > 0) {
      const thread = threads.find(t => t.postId === highlightPostId);
      if (thread) {
        selectThread(thread);
        setShowConversation(true);
        // Clear the query param after selecting
        setSearchParams({}, { replace: true });
      }
    }
  }, [highlightPostId, threads]);

  const loadThreads = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const userThreads = await messageService.getThreads();

      // Preload post and user data for each thread
      const posts: { [threadId: string]: Post } = {};
      const users: { [threadId: string]: User } = {};

      for (const thread of userThreads) {
        const post = await postService.getById(thread.postId);
        if (post) {
          posts[thread.id] = post;
        }

        const otherUserId = thread.participants.find(p => p !== currentUser.id);
        if (otherUserId) {
          const user = await userService.getById(otherUserId);
          if (user) {
            users[thread.id] = user;
          }
        }
      }

      setThreadPosts(posts);
      setThreadUsers(users);

      // Filter to only show threads where current user is the REQUESTER (not the post owner)
      // Activity page is for tracking books you've requested from others
      const requesterThreads = userThreads.filter(thread => {
        const post = posts[thread.id];
        return post && post.userId !== currentUser.id;
      });

      // Sort by most recent message
      const sortedThreads = requesterThreads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      setThreads(sortedThreads);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'SESSION_EXPIRED') {
        showToast(ERROR_MESSAGES.SESSION_EXPIRED, 'error');
      } else if (err.code === 'UNAUTHORIZED') {
        showToast(ERROR_MESSAGES.UNAUTHORIZED, 'error');
      } else if (err.code === 'NETWORK_ERROR') {
        showToast(ERROR_MESSAGES.NETWORK_ERROR, 'error');
      } else {
        showToast(ERROR_MESSAGES.GENERIC_LOAD_ERROR, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectThread = async (thread: MessageThread) => {
    if (!currentUser) return;

    setSelectedThread(thread);
    setShowConversation(true);

    // Load messages
    const threadMessages = await messageService.getMessages(thread.id);
    setMessages(threadMessages);

    // Mark as read
    await messageService.markAsRead(thread.id);

    // Update thread in list to clear unread count
    setThreads(prev => prev.map(t =>
      t.id === thread.id
        ? { ...t, unreadCount: { ...t.unreadCount, [currentUser.id]: 0 } }
        : t
    ));

    // Check vouch status
    await checkVouchStatus(thread);
  };

  const checkVouchStatus = async (thread: MessageThread) => {
    if (!currentUser) return;

    const otherUserId = thread.participants.find(p => p !== currentUser.id);
    if (!otherUserId) return;

    // Check if exchange/gift is completed
    const hasCompletedExchange = messages.some(
      m => m.type === 'system' &&
      (m.systemMessageType === 'exchange_completed' || m.systemMessageType === 'gift_completed')
    );

    if (!hasCompletedExchange) {
      setCanVouch(false);
      return;
    }

    // Check if already vouched
    const vouches = await vouchService.getForUser(currentUser.id);
    const existingVouch = vouches.find(
      v => (v.user1Id === currentUser.id && v.user2Id === otherUserId) ||
           (v.user2Id === currentUser.id && v.user1Id === otherUserId)
    );

    if (existingVouch) {
      setHasVouched(true);
      setCanVouch(false);
    } else {
      setHasVouched(false);
      setCanVouch(true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedThread || !newMessage.trim()) return;

    setSending(true);
    try {
      const message = await messageService.sendMessage({
        threadId: selectedThread.id,
        content: newMessage.trim(),
      });

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Update thread list
      setThreads(prev => prev.map(t =>
        t.id === selectedThread.id
          ? { ...t, lastMessageAt: message.timestamp }
          : t
      ).sort((a, b) => b.lastMessageAt - a.lastMessageAt));

      // Reload threads to get updated unread counts
      await loadThreads();
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'NOT_THREAD_PARTICIPANT') {
        showToast('You are no longer a participant in this conversation.', 'error');
      } else if (err.code === 'THREAD_NOT_FOUND') {
        showToast('This conversation no longer exists.', 'error');
      } else {
        showToast('Unable to send your message. Please try again.', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const handleVouch = async () => {
    if (!currentUser || !selectedThread) return;

    const otherUserId = selectedThread.participants.find(p => p !== currentUser.id);
    if (!otherUserId) return;

    setVouchLoading(true);
    try {
      await vouchService.create(currentUser.id, otherUserId);
      setHasVouched(true);
      setCanVouch(false);
      showToast('You vouched for this person!', 'success');
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'CANNOT_VOUCH_SELF') {
        showToast('You cannot vouch for yourself.', 'error');
      } else {
        showToast('Unable to submit your vouch. Please try again.', 'error');
      }
    } finally {
      setVouchLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!currentUser || !selectedThread) return;

    const post = threadPosts[selectedThread.id];
    const confirmed = await confirm({
      title: 'Cancel Request',
      message: `Cancel your request for "${post?.book.title || 'this book'}"?`,
      confirmText: 'Cancel Request',
      variant: 'danger'
    });
    if (!confirmed) return;

    setStatusLoading(true);
    try {
      await messageService.updateThreadStatus(selectedThread.id, 'cancelled_by_requester');
      showToast('Request cancelled', 'info');
      await loadThreads();
      setSelectedThread(null);
      setShowConversation(false);
    } catch (error) {
      showToast('Failed to cancel request:' + error, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!currentUser || !selectedThread) return;

    setStatusLoading(true);
    try {
      await messageService.updateThreadStatus(selectedThread.id, 'dismissed');
      showToast('Dismissed', 'info');
      await loadThreads();
      setSelectedThread(null);
      setShowConversation(false);
    } catch (error) {
      showToast('Failed to dismiss:' + error, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCompleteExchange = async () => {
    if (!currentUser || !selectedThread) return;

    const post = threadPosts[selectedThread.id];
    const isExchange = post?.type === 'exchange';

    const confirmed = await confirm({
      title: isExchange ? 'Complete Trade' : 'Complete Receipt',
      message: isExchange
        ? `Did you complete the trade for "${post?.book.title || 'the book'}"?`
        : `Did you receive "${post?.book.title || 'the book'}"?`,
      confirmText: isExchange ? 'Yes, trade completed' : 'Yes, I received it',
      variant: 'info'
    });
    if (!confirmed) return;

    setStatusLoading(true);
    try {
      await messageService.markComplete(selectedThread.id);
      showToast(isExchange ? 'Trade completed!' : 'Gift received!', 'success');
      await loadThreads();
      // Reload the selected thread to update UI
      const updatedThreads = await messageService.getThreads();
      const updatedThread = updatedThreads.find(t => t.id === selectedThread.id);
      if (updatedThread) {
        setSelectedThread(updatedThread);
      }
      // Reload messages to show any system message
      const updatedMessages = await messageService.getMessages(selectedThread.id);
      setMessages(updatedMessages);
    } catch (error) {
      showToast('Failed to complete: ' + error, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAcceptProposal = async (messageId: string) => {
    if (!selectedThread) return;

    setRespondingToProposal(true);
    try {
      await messageService.respondToProposal(selectedThread.id, messageId, 'accept');
      // Update the proposal message status in state
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, proposalStatus: 'accepted' } : m
      ));
      showToast('Exchange accepted! Coordinate the handoff in messages.', 'success');
      // Reload thread to get updated status
      const updatedThreads = await messageService.getThreads();
      const updatedThread = updatedThreads.find(t => t.id === selectedThread.id);
      if (updatedThread) {
        setSelectedThread(updatedThread);
      }
    } catch (error) {
      console.error('Failed to accept proposal:', error);
      showToast('Failed to accept exchange proposal', 'error');
    } finally {
      setRespondingToProposal(false);
    }
  };

  const handleDeclineProposal = async (messageId: string, requestedPost: Post | undefined) => {
    if (!selectedThread) return;

    const confirmed = await confirm({
      title: 'Decline Exchange?',
      message: `Are you sure you want to decline "${requestedPost?.book.title || 'this book'}" as an exchange?`,
      confirmText: 'Decline',
      variant: 'warning'
    });

    if (!confirmed) return;

    setRespondingToProposal(true);
    try {
      await messageService.respondToProposal(selectedThread.id, messageId, 'decline');
      // Update the proposal message status in state
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, proposalStatus: 'declined' } : m
      ));
      showToast('Exchange proposal declined', 'info');
    } catch (error) {
      console.error('Failed to decline proposal:', error);
      showToast('Failed to decline exchange proposal', 'error');
    } finally {
      setRespondingToProposal(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!currentUser || !selectedThread) return;

    const post = threadPosts[selectedThread.id];
    const confirmed = await confirm({
      title: 'Complete Return',
      message: `Did you return "${post?.book.title || 'the book'}"?`,
      confirmText: 'Yes, I returned it',
      variant: 'info'
    });
    if (!confirmed) return;

    setStatusLoading(true);
    try {
      const result = await messageService.confirmReturn(selectedThread.id);
      if (result.bothConfirmedReturn) {
        showToast('Loan completed!', 'success');
      } else {
        showToast('Return recorded', 'success');
      }
      await loadThreads();
      // Reload the selected thread to update UI
      const updatedThreads = await messageService.getThreads();
      const updatedThread = updatedThreads.find(t => t.id === selectedThread.id);
      if (updatedThread) {
        setSelectedThread(updatedThread);
      }
    } catch (error) {
      showToast('Failed to record return: ' + error, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Check if current user is the requester (not the post owner)
  const isRequester = (thread: MessageThread): boolean => {
    const post = threadPosts[thread.id];
    return post ? post.userId !== currentUser?.id : true;
  };

  // Get status message for non-active threads
  const getStatusMessage = (status: MessageThreadStatus): string | null => {
    switch (status) {
      case 'declined_by_owner':
        return 'Your request was declined';
      case 'given_to_other':
        return 'This book was given to someone else';
      case 'cancelled_by_requester':
        return 'You cancelled this request';
      case 'accepted':
        return 'Your request was accepted!';
      case 'on_loan':
        return 'You currently have this book on loan';
      default:
        return null;
    }
  };

  const getSystemMessageDisplay = (type: Message['systemMessageType'], content?: string) => {
    switch (type) {
      case 'exchange_proposed': return { icon: '📦', text: 'Exchange Proposed' };
      case 'exchange_completed': return { icon: '✅', text: 'Exchange Completed' };
      case 'exchange_declined': return { icon: '❌', text: 'Exchange Declined' };
      case 'exchange_cancelled': return { icon: '🚫', text: 'Exchange Cancelled' };
      case 'gift_completed': return { icon: '🎁', text: 'Gift Completed' };
      case 'request_cancelled': return { icon: '🚫', text: 'Request cancelled' };
      default: return { icon: 'ℹ️', text: content || 'System Message' };
    }
  };

  const handleBackToList = () => {
    setShowConversation(false);
    setSelectedThread(null);
    navigate('/activity');
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Please log in to view messages</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-128px)] flex flex-col">
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Activity</h1>

        {/* Desktop: Split View, Mobile: Conditional View */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Thread List */}
          <div className={`${
            showConversation ? 'hidden md:block' : 'block'
          } w-full md:w-80 flex-shrink-0 flex flex-col`}>
            <div className="card p-0 flex-1 flex flex-col overflow-hidden">
              {threads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No activity yet</p>
                  <p className="text-sm mt-2">Start a conversation by commenting on a post</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {/* Active threads */}
                  {threads.filter(t => !t.requesterCompleted).map(thread => {
                    const post = threadPosts[thread.id];
                    const otherUser = threadUsers[thread.id];
                    const unreadCount = thread.unreadCount[currentUser.id] || 0;

                    if (!post || !otherUser) return null;

                    return (
                      <button
                        key={thread.id}
                        onClick={() => selectThread(thread)}
                        className={`w-full p-4 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-200 text-left ${
                          selectedThread?.id === thread.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        {/* Book thumbnail */}
                        <div className="flex-shrink-0">
                          {post.book.coverImage ? (
                            <img
                              src={post.book.coverImage}
                              alt={post.book.title}
                              className="w-12 h-16 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No cover</span>
                            </div>
                          )}
                        </div>

                        {/* Thread info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {post.book.title}
                              </h3>
                              <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                                post.type === 'giveaway'
                                  ? 'bg-green-100 text-green-700'
                                  : post.type === 'exchange'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                              }`}>
                                {post.type === 'giveaway' ? 'Gift' : post.type === 'exchange' ? 'Trade' : 'Loan'}
                              </span>
                            </div>
                            {unreadCount > 0 && (
                              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate mb-1">
                            {otherUser.username}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatTimestamp(thread.lastMessageAt)}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Completed section */}
                  {threads.some(t => t.requesterCompleted) && (
                    <>
                      <h2 className="px-4 py-3 text-sm font-semibold text-gray-500 bg-gray-100 border-b border-gray-200">
                        Completed
                      </h2>
                      {threads.filter(t => t.requesterCompleted).map(thread => {
                        const post = threadPosts[thread.id];
                        const otherUser = threadUsers[thread.id];

                        if (!post || !otherUser) return null;

                        return (
                          <button
                            key={thread.id}
                            onClick={() => selectThread(thread)}
                            className={`w-full p-4 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-200 text-left opacity-75 ${
                              selectedThread?.id === thread.id ? 'bg-primary-50' : ''
                            }`}
                          >
                            {/* Book thumbnail */}
                            <div className="flex-shrink-0">
                              {post.book.coverImage ? (
                                <img
                                  src={post.book.coverImage}
                                  alt={post.book.title}
                                  className="w-12 h-16 object-cover rounded shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No cover</span>
                                </div>
                              )}
                            </div>

                            {/* Thread info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {post.book.title}
                                  </h3>
                                  <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                                    ✓ {post.type === 'giveaway' ? 'Received' : post.type === 'exchange' ? 'Traded' : 'Returned'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 truncate mb-1">
                                {otherUser.username}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatTimestamp(thread.lastMessageAt)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Conversation View */}
          <div className={`${
            showConversation ? 'block' : 'hidden md:block'
          } flex-1 flex flex-col min-w-0`}>
            {selectedThread && threadPosts[selectedThread.id] && threadUsers[selectedThread.id] ? (
              <div className="card p-0 flex-1 flex flex-col overflow-hidden">
                {/* Header with post info */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  {/* Mobile back button */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden mb-3 flex items-center gap-2 text-primary-600 hover:text-primary-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>

                  <div className="flex gap-3">
                    {threadPosts[selectedThread.id].book.coverImage ? (
                      <img
                        src={threadPosts[selectedThread.id].book.coverImage}
                        alt={threadPosts[selectedThread.id].book.title}
                        className="w-16 h-20 object-cover rounded shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xs">No cover</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-lg text-gray-900 truncate">
                        {threadPosts[selectedThread.id].book.title}
                      </h2>
                      <p className="text-sm text-gray-600 truncate">
                        by {threadPosts[selectedThread.id].book.author}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Conversation with{' '}
                        <span className="font-medium text-primary-600">
                          {threadUsers[selectedThread.id].username}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages yet</p>
                      <p className="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    messages.map(message => {
                      if (message.type === 'system') {
                        const { icon, text } = getSystemMessageDisplay(message.systemMessageType, message.content);
                        return (
                          <div key={message.id} className="flex justify-center">
                            <div className="bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-700 flex items-center gap-2">
                              <span>{icon}</span>
                              <span className="font-medium">{text}</span>
                            </div>
                          </div>
                        );
                      }

                      // Trade proposal visual card
                      // Shows requestedPostId = the book the POSTER SELECTED from the requester's collection
                      // (NOT offeredPostId which is the poster's original book)
                      if (message.type === 'trade_proposal') {
                        const selectedPost = message.requestedPostId ? proposalPosts[message.requestedPostId] : undefined;
                        const isMyProposal = message.senderId === currentUser.id;
                        const isPending = message.proposalStatus === 'pending';

                        return (
                          <div key={message.id} className="flex justify-center my-2">
                            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                              {/* Book cover and title - shows the book the poster selected */}
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center mb-2">
                                  {selectedPost?.book.coverImage ? (
                                    <img
                                      src={selectedPost.book.coverImage}
                                      alt={selectedPost.book.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-gray-400 text-xs">No cover</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 font-medium text-center max-w-[120px] truncate" title={selectedPost?.book.title}>
                                  {selectedPost?.book.title || 'Loading...'}
                                </p>
                              </div>

                              {/* Accept/Decline buttons for recipient */}
                              {!isMyProposal && isPending && (
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleAcceptProposal(message.id)}
                                    disabled={respondingToProposal}
                                    className="flex-1 btn-primary text-xs py-1.5 disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleDeclineProposal(message.id, selectedPost)}
                                    disabled={respondingToProposal}
                                    className="flex-1 btn-secondary text-xs py-1.5 disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}

                              {/* Timestamp */}
                              <p className="text-xs text-gray-400 text-center mt-2">
                                {formatTimestamp(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      const isCurrentUser = message.senderId === currentUser.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-lg ${
                              isCurrentUser
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isCurrentUser ? 'text-primary-100' : 'text-gray-500'
                              }`}
                            >
                              {formatTimestamp(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  {/* Status banner for non-active threads */}
                  {selectedThread.status !== 'active' && (
                    <div className={`mb-3 p-3 rounded-lg ${
                      selectedThread.status === 'accepted'
                        ? 'bg-green-50 border border-green-200'
                        : selectedThread.status === 'on_loan'
                          ? (() => {
                              const isOverdue = selectedThread.loanDueDate && selectedThread.loanDueDate < Date.now();
                              return isOverdue
                                ? 'bg-red-50 border border-red-300'
                                : 'bg-purple-50 border border-purple-200';
                            })()
                          : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`text-sm ${
                            selectedThread.status === 'accepted'
                              ? 'text-green-800'
                              : selectedThread.status === 'on_loan'
                                ? (() => {
                                    const isOverdue = selectedThread.loanDueDate && selectedThread.loanDueDate < Date.now();
                                    return isOverdue ? 'text-red-800' : 'text-purple-800';
                                  })()
                                : 'text-yellow-800'
                          }`}>
                            {getStatusMessage(selectedThread.status)}
                          </p>
                          {selectedThread.status === 'on_loan' && selectedThread.loanDueDate && (
                            <p className={`text-xs mt-1 ${
                              selectedThread.loanDueDate < Date.now()
                                ? 'text-red-700 font-medium'
                                : 'text-purple-600'
                            }`}>
                              {selectedThread.loanDueDate < Date.now()
                                ? `Overdue! Was due ${new Date(selectedThread.loanDueDate).toLocaleDateString()}`
                                : `Due ${new Date(selectedThread.loanDueDate).toLocaleDateString()}`}
                            </p>
                          )}
                          {selectedThread.status === 'accepted' && (
                            <p className="text-xs text-gray-600 mt-1">
                              {(() => {
                                const isExchange = threadPosts[selectedThread.id]?.type === 'exchange';
                                if (selectedThread.requesterCompleted) {
                                  return isExchange ? '✓ Trade completed' : '✓ Gift received';
                                }
                                return isExchange
                                  ? 'Coordinate the exchange, then mark as complete'
                                  : 'Coordinate pickup, then mark as complete';
                              })()}
                            </p>
                          )}
                        </div>
                        {(selectedThread.status === 'declined_by_owner' || selectedThread.status === 'given_to_other') && (
                          <button
                            onClick={handleDismiss}
                            disabled={statusLoading}
                            className="text-sm px-3 py-1 text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        )}
                        {selectedThread.status === 'accepted' && isRequester(selectedThread) && !selectedThread.requesterCompleted && (
                          <button
                            onClick={handleCompleteExchange}
                            disabled={statusLoading}
                            className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {statusLoading ? 'Completing...' : threadPosts[selectedThread.id]?.type === 'exchange' ? 'Trade Completed' : 'Gift Received'}
                          </button>
                        )}
                        {selectedThread.status === 'on_loan' && isRequester(selectedThread) && !selectedThread.requesterConfirmedReturn && (
                          <button
                            onClick={handleConfirmReturn}
                            disabled={statusLoading}
                            className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {statusLoading ? 'Recording...' : 'I Returned It'}
                          </button>
                        )}
                        {selectedThread.status === 'on_loan' && isRequester(selectedThread) && selectedThread.requesterConfirmedReturn && (
                          <span className="px-3 py-1 text-sm text-purple-700 bg-purple-100 rounded">
                            ✓ Return completed
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cancel button for active requests */}
                  {selectedThread.status === 'active' && isRequester(selectedThread) && (
                    <div className="mb-3 flex justify-end">
                      <button
                        onClick={handleCancelRequest}
                        disabled={statusLoading}
                        className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}

                  {canVouch && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-green-800">
                          Have you met {threadUsers[selectedThread.id].username} in person?
                        </p>
                        <button
                          onClick={handleVouch}
                          disabled={vouchLoading}
                          className="btn-primary text-sm py-1 px-3 whitespace-nowrap disabled:opacity-50"
                        >
                          {vouchLoading ? 'Vouching...' : 'I met this person'}
                        </button>
                      </div>
                    </div>
                  )}

                  {hasVouched && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 flex items-center gap-2">
                        <span>✓</span>
                        You vouched for {threadUsers[selectedThread.id].username}
                      </p>
                    </div>
                  )}

                  {/* Only show message input for active/accepted/on_loan threads */}
                  {(selectedThread.status === 'active' || selectedThread.status === 'accepted' || selectedThread.status === 'on_loan') && (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="input flex-1"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="card flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {ConfirmDialogComponent}
    </div>
  );
}

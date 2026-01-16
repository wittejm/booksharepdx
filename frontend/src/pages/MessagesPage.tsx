import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { MessageThread, Message, Post, User } from '@booksharepdx/shared';
import { messageService, postService, userService, vouchService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/useToast';
import ToastContainer from '../components/ToastContainer';
import { formatTimestamp } from '../utils/time';
import { ERROR_MESSAGES } from '../utils/errorMessages';

export default function MessagesPage() {
  const { threadId } = useParams<{ threadId?: string }>();
  const { currentUser } = useUser();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { showToast, toasts, dismiss } = useToast();

  // Thread data cache
  const [threadPosts, setThreadPosts] = useState<{ [threadId: string]: Post }>({});
  const [threadUsers, setThreadUsers] = useState<{ [threadId: string]: User }>({});

  // Mobile view state
  const [showConversation, setShowConversation] = useState(false);

  // Vouch state
  const [canVouch, setCanVouch] = useState(false);
  const [hasVouched, setHasVouched] = useState(false);
  const [vouchLoading, setVouchLoading] = useState(false);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [currentUser]);

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

  const loadThreads = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const userThreads = await messageService.getThreads(currentUser.id);
      // Sort by most recent message
      const sortedThreads = userThreads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      setThreads(sortedThreads);

      // Preload post and user data for each thread
      const posts: { [threadId: string]: Post } = {};
      const users: { [threadId: string]: User } = {};

      for (const thread of sortedThreads) {
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
    await messageService.markAsRead(thread.id, currentUser.id);

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
        senderId: currentUser.id,
        content: newMessage.trim(),
        type: 'user',
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


  const getSystemMessageDisplay = (type: Message['systemMessageType']) => {
    switch (type) {
      case 'exchange_proposed': return { icon: '📦', text: 'Exchange Proposed' };
      case 'exchange_completed': return { icon: '✅', text: 'Exchange Completed' };
      case 'exchange_declined': return { icon: '❌', text: 'Exchange Declined' };
      case 'exchange_cancelled': return { icon: '🚫', text: 'Exchange Cancelled' };
      case 'gift_completed': return { icon: '🎁', text: 'Gift Completed' };
      default: return { icon: 'ℹ️', text: 'System Message' };
    }
  };

  const handleBackToList = () => {
    setShowConversation(false);
    setSelectedThread(null);
    navigate('/messages');
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
                  {threads.map(thread => {
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
                            <h3 className="font-semibold text-gray-900 truncate">
                              {post.book.title}
                            </h3>
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
                        const { icon, text } = getSystemMessageDisplay(message.systemMessageType);
                        return (
                          <div key={message.id} className="flex justify-center">
                            <div className="bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-700 flex items-center gap-2">
                              <span>{icon}</span>
                              <span className="font-medium">{text}</span>
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
    </div>
  );
}

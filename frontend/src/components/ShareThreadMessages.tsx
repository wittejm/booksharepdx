import { useState, useEffect, useRef } from "react";
import type { Message, Post } from "@booksharepdx/shared";
import { messageService, postService } from "../services";
import { useUser } from "../contexts/UserContext";
import { useToast } from "./useToast";
import { useConfirm } from "./useConfirm";
import { formatTimestamp } from "../utils/time";

interface ShareThreadMessagesProps {
  threadId: string;
  otherUsername: string;
  highlightBanner?: string; // Optional banner to show at top (e.g., "You proposed an exchange")
}

export default function ShareThreadMessages({
  threadId,
  otherUsername,
  highlightBanner,
}: ShareThreadMessagesProps) {
  const { currentUser } = useUser();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);
  const [proposalPosts, setProposalPosts] = useState<Record<string, Post>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [threadId]);

  useEffect(() => {
    // Scroll to bottom when messages change, but only within the visible area
    // Using 'nearest' prevents scrolling the whole page when embedded in ShareCard
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages]);

  // Load posts for trade proposals
  // IMPORTANT - Trade proposal field semantics:
  //   - offeredPostId = the POSTER's book (what they're giving away)
  //   - requestedPostId = the REQUESTER's book (what the poster SELECTED/WANTS)
  // We display requestedPostId because that's the book the poster chose from the requester's collection
  useEffect(() => {
    const loadProposalPosts = async () => {
      const tradeProposals = messages.filter(
        (m) => m.type === "trade_proposal",
      );
      const postIdsToLoad = new Set<string>();

      tradeProposals.forEach((proposal) => {
        // Load the REQUESTED post (the book the poster selected from the requester)
        if (
          proposal.requestedPostId &&
          !proposalPosts[proposal.requestedPostId]
        ) {
          postIdsToLoad.add(proposal.requestedPostId);
        }
      });

      if (postIdsToLoad.size === 0) return;

      const loadedPosts: Record<string, Post> = {};
      await Promise.all(
        Array.from(postIdsToLoad).map(async (postId) => {
          const post = await postService.getById(postId);
          if (post) loadedPosts[postId] = post;
        }),
      );

      setProposalPosts((prev) => ({ ...prev, ...loadedPosts }));
    };

    loadProposalPosts();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const threadMessages = await messageService.getMessages(threadId);
      setMessages(threadMessages);
      // Mark as read
      await messageService.markAsRead(threadId);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newMessage.trim()) return;

    setSending(true);
    try {
      const message = await messageService.sendMessage({
        threadId,
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptProposal = async (messageId: string) => {
    setResponding(true);
    try {
      await messageService.respondToProposal(threadId, messageId, "accept");
      // Update the proposal message status in state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, proposalStatus: "accepted" } : m,
        ),
      );
      showToast(
        "Exchange accepted! Coordinate the handoff in messages.",
        "success",
      );
    } catch (error) {
      showToast(
        "Failed to accept exchange proposal: " + (error as Error).message,
        "error"
      );
    } finally {
      setResponding(false);
    }
  };

  const handleDeclineProposal = async (
    messageId: string,
    offeredPost: Post | undefined,
  ) => {
    const confirmed = await confirm({
      title: "Decline Exchange?",
      message: `Are you sure you want to decline "${offeredPost?.book.title || "this book"}" as an exchange?`,
      confirmText: "Decline",
      variant: "warning",
    });

    if (!confirmed) return;

    setResponding(true);
    try {
      await messageService.respondToProposal(threadId, messageId, "decline");
      // Update the proposal message status in state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, proposalStatus: "declined" } : m,
        ),
      );
      showToast("Exchange proposal declined", "info");
    } catch (error) {
      showToast(
        "Failed to decline exchange proposal: " + (error as Error).message,
        "error"
      );
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200">
      {/* Highlight banner */}
      {highlightBanner && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
          <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            {highlightBanner}
          </p>
        </div>
      )}
      {/* Messages list */}
      <div className="max-h-64 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((message) => {
            if (message.type === "system") {
              return (
                <div key={message.id} className="flex justify-center">
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {message.content}
                  </span>
                </div>
              );
            }

            // Trade proposal visual card
            // Shows requestedPostId = the book the POSTER SELECTED from the requester's collection
            // (NOT offeredPostId which is the poster's original book)
            if (message.type === "trade_proposal") {
              const selectedPost = message.requestedPostId
                ? proposalPosts[message.requestedPostId]
                : undefined;
              const isMyProposal = message.senderId === currentUser?.id;
              const isPending = message.proposalStatus === "pending";

              return (
                <div
                  key={message.id}
                  className={`flex ${isMyProposal ? "justify-end" : "justify-start"} my-2`}
                >
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    {/* Label */}
                    <p className="text-xs font-medium mb-2 text-gray-500">
                      Proposed trade
                    </p>
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
                          <span className="text-gray-400 text-xs">
                            No cover
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs font-medium text-center max-w-[120px] truncate text-gray-700"
                        title={selectedPost?.book.title}
                      >
                        {selectedPost?.book.title || "Loading..."}
                      </p>
                    </div>

                    {/* Accept/Decline buttons for recipient */}
                    {!isMyProposal && isPending && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAcceptProposal(message.id)}
                          disabled={responding}
                          className="flex-1 btn-primary text-xs py-1.5 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            handleDeclineProposal(message.id, selectedPost)
                          }
                          disabled={responding}
                          className="flex-1 btn-secondary text-xs py-1.5 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-center mt-2 text-gray-400">
                      {formatTimestamp(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }

            const isMe = message.senderId === currentUser?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    isMe
                      ? "bg-primary-600 text-white"
                      : "bg-white border border-gray-200 text-gray-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${isMe ? "text-primary-200" : "text-gray-400"}`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-gray-200"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${otherUsername}...`}
            className="input flex-1 text-sm py-2"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </form>
      {ConfirmDialogComponent}
    </div>
  );
}

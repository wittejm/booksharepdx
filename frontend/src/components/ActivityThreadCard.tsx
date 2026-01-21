import type { MessageThread, Post, User } from "@booksharepdx/shared";
import { formatTimestamp } from "../utils/time";

type ActivityThreadCardProps = {
  selected: boolean;
  thread: MessageThread;
  post: Post;
  otherUser: User;
  unreadCount: number;
  selectThread: (thread: MessageThread) => Promise<void>;
};

export default function ActivityThreadCard({
  selected,
  thread,
  post,
  otherUser,
  unreadCount,
  selectThread,
}: ActivityThreadCardProps) {
  return (
    <button
      key={thread.id}
      onClick={() => selectThread(thread)}
      className={`w-full p-4 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-200 text-left ${
        selected ? "bg-primary-50" : ""
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
            <span
              className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                post.type === "giveaway"
                  ? "bg-green-100 text-green-700"
                  : post.type === "exchange"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
              }`}
            >
              {post.type === "giveaway"
                ? "Gift"
                : post.type === "exchange"
                  ? "Trade"
                  : "Loan"}
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
}

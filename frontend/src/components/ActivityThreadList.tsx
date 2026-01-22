import type { MessageThread, Post, User } from "@booksharepdx/shared";
import ActivityThreadCard from "./ActivityThreadCard";

type ActivityThreadListProps = {
  hide: boolean;
  currentUser: User;
  threads: MessageThread[];
  threadPosts: { [key: string]: Post };
  threadUsers: { [key: string]: User };
  selectedThread: MessageThread | null;
  selectThread: (thread: MessageThread) => Promise<void>;
};

export default function ActivityThreadList({
  hide,
  currentUser,
  threads,
  threadPosts,
  threadUsers,
  selectedThread,
  selectThread,
}: ActivityThreadListProps) {
  return (
    <div
      className={`${
        hide ? "hidden md:block" : "block"
      } w-full md:w-80 flex-shrink-0 flex flex-col`}
    >
      <div className="card p-0 flex-1 flex flex-col overflow-hidden">
        {threads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No activity yet</p>
            <p className="text-sm mt-2">
              Start a conversation by responding to a post
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Active threads */}
            {threads
              .filter((t) => !t.requesterCompleted)
              .map((thread) => {
                const post = threadPosts[thread.id];
                const otherUser = threadUsers[thread.id];
                const unreadCount = thread.unreadCount[currentUser.id] || 0;

                if (!post || !otherUser) return null;

                return (
                  <ActivityThreadCard
                    selected={thread.id === selectedThread?.id}
                    thread={thread}
                    post={post}
                    otherUser={otherUser}
                    unreadCount={unreadCount}
                    selectThread={selectThread}
                  />
                );
              })}

            {/* Completed section */}
            {threads.some((t) => t.requesterCompleted) && (
              <>
                <h2 className="px-4 py-3 text-sm font-semibold text-gray-500 bg-gray-100 border-b border-gray-200">
                  Completed
                </h2>
                {threads
                  .filter((t) => t.requesterCompleted)
                  .map((thread) => {
                    const post = threadPosts[thread.id];
                    const otherUser = threadUsers[thread.id];
                    const unreadCount = thread.unreadCount[currentUser.id] || 0;

                    if (!post || !otherUser) return null;

                    return (
                      <ActivityThreadCard
                        selected={false}
                        thread={thread}
                        post={post}
                        otherUser={otherUser}
                        unreadCount={unreadCount}
                        selectThread={selectThread}
                      />
                    );
                  })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { createContext, useContext, useCallback } from "react";
import { messageService, postService } from "../services";
import { useUser } from "./UserContext";
import { useAsync } from "../hooks/useAsync";

interface ActivitySummary {
  activeCount: number; // all non-completed requester threads (for header badge)
  acceptedGiftCount: number; // accepted giveaways awaiting completion
  acceptedTradeCount: number; // accepted exchanges awaiting completion
}

const defaultSummary: ActivitySummary = {
  activeCount: 0,
  acceptedGiftCount: 0,
  acceptedTradeCount: 0,
};

interface ActivityContextType {
  summary: ActivitySummary;
  loading: boolean;
  refresh: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ActivityContext = createContext<ActivityContextType>({
  summary: defaultSummary,
  loading: false,
  refresh: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useActivity = () => useContext(ActivityContext);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();

  const fetchSummary = useCallback(async (): Promise<ActivitySummary> => {
    if (!currentUser) return defaultSummary;

    try {
      const threads = await messageService.getThreads();

      // Fetch posts to determine which threads the user is the requester on
      const postResults = await Promise.all(
        threads.map((t) =>
          postService.getById(t.postId).then((post) => ({ threadId: t.id, post })),
        ),
      );

      const threadPosts: Record<string, { userId: string; type: string }> = {};
      postResults.forEach(({ threadId, post }) => {
        if (post) threadPosts[threadId] = post;
      });

      // Filter to requester threads (where current user is NOT the post owner)
      const requesterThreads = threads.filter((t) => {
        const post = threadPosts[t.id];
        return post && post.userId !== currentUser.id && !t.requesterCompleted;
      });

      // Count accepted threads by post type
      let acceptedGiftCount = 0;
      let acceptedTradeCount = 0;
      for (const t of requesterThreads) {
        if (t.status === "accepted") {
          const post = threadPosts[t.id];
          if (post.type === "giveaway") {
            acceptedGiftCount++;
          } else if (post.type === "exchange") {
            acceptedTradeCount++;
          }
        }
      }

      return {
        activeCount: requesterThreads.length,
        acceptedGiftCount,
        acceptedTradeCount,
      };
    } catch {
      // API errors are already toasted by apiClient
      return defaultSummary;
    }
  }, [currentUser]);

  const {
    data: summary,
    loading,
    refetch: refresh,
  } = useAsync(fetchSummary, [currentUser], defaultSummary);

  return (
    <ActivityContext.Provider
      value={{ summary: summary ?? defaultSummary, loading, refresh }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

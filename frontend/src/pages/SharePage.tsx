import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useParams, useNavigate, Navigate } from "react-router-dom";
import type { Post, MessageThread } from "@booksharepdx/shared";
import { postService, messageService } from "../services";
import { useUser } from "../contexts/UserContext";
import { useInterest } from "../contexts/InterestContext";
import { useAsync } from "../hooks/useAsync";
import ShareCard from "../components/ShareCard";
import InlineShareForm from "../components/InlineShareForm";

type TabType = "active" | "archive";

type ShareData = {
  posts: Post[];
  threads: MessageThread[];
};

export default function SharePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { threadId: routeThreadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const { summary: interestSummary } = useInterest();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasScrolledToInterest = useRef(false);
  const hasScrolledToThread = useRef(false);

  const shouldAutoFocusShare = searchParams.get("action") === "share";
  const shouldScrollToInterest =
    searchParams.get("scrollToInterest") === "true";

  const fetchShareData = useCallback(async (): Promise<ShareData> => {
    if (!currentUser) {
      return { posts: [], threads: [] };
    }
    const [activePosts, agreedPosts, archivedPosts, threads] =
      await Promise.all([
        postService.getByUserId(currentUser.id, "active"),
        postService.getByUserId(currentUser.id, "agreed_upon"),
        postService.getByUserId(currentUser.id, "archived"),
        messageService.getThreads(),
      ]);
    return {
      posts: [...activePosts, ...agreedPosts, ...archivedPosts],
      threads,
    };
  }, [currentUser]);

  const {
    data,
    loading,
    refetch: reloadPosts,
  } = useAsync(fetchShareData, [currentUser], { posts: [], threads: [] });

  const posts = data?.posts ?? [];
  const threads = data?.threads ?? [];

  // Find the post that contains the route threadId
  const threadFromRoute = routeThreadId
    ? threads.find((t) => t.id === routeThreadId)
    : null;
  const focusPostId = threadFromRoute?.postId ?? null;
  const showThreadId = routeThreadId ?? null;

  // Scroll to post containing the thread from route param
  useEffect(() => {
    if (
      routeThreadId &&
      !loading &&
      !hasScrolledToThread.current &&
      focusPostId
    ) {
      const element = postRefs.current.get(focusPostId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove(
              "ring-2",
              "ring-blue-500",
              "ring-offset-2",
            );
          }, 2000);
        }, 100);
        hasScrolledToThread.current = true;
      }
    }
  }, [routeThreadId, loading, focusPostId]);

  // Scroll to first post with interest when requested
  useEffect(() => {
    if (
      shouldScrollToInterest &&
      !loading &&
      !hasScrolledToInterest.current &&
      interestSummary.interests.length > 0
    ) {
      // Find the first post with active interest
      const firstInterestPostId = interestSummary.interests[0]?.postId;
      if (firstInterestPostId) {
        const element = postRefs.current.get(firstInterestPostId);
        if (element) {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // Highlight effect
            element.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
            setTimeout(() => {
              element.classList.remove(
                "ring-2",
                "ring-blue-500",
                "ring-offset-2",
              );
            }, 2000);
          }, 100);
          hasScrolledToInterest.current = true;
          // Remove the query param
          setSearchParams({}, { replace: true });
        }
      }
    }
  }, [shouldScrollToInterest, loading, interestSummary, setSearchParams]);

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const getTradingPartnerPostId = (post: Post): string | undefined => {
    if (!post.agreedExchange || !currentUser) return undefined;
    const isResponder = currentUser.id === post.agreedExchange.responderUserId;
    return isResponder
      ? post.agreedExchange.sharerPostId
      : post.agreedExchange.responderPostId;
  };

  // Helper to check if owner has completed a post (via its accepted thread)
  // For trades, the thread may be on the OTHER post in the exchange, so check both
  const isOwnerCompleted = (post: Post): boolean => {
    // First check if there's a thread directly on this post
    let acceptedThread = threads.find(
      (t) => t.postId === post.id && t.status === "accepted",
    );

    // For trades, also check the other post in the exchange
    const partnerPostId = getTradingPartnerPostId(post);
    if (!acceptedThread && partnerPostId) {
      acceptedThread = threads.find(
        (t) => t.postId === partnerPostId && t.status === "accepted",
      );
    }

    return acceptedThread?.ownerCompleted ?? false;
  };

  const getActivePosts = () => {
    // Active = posts where owner has NOT marked complete
    // - 'active' posts (no one accepted yet)
    // - 'agreed_upon' posts where ownerCompleted is false
    const activePosts = posts.filter((p) => {
      if (p.status === "active") return true;
      if (p.status === "agreed_upon") return !isOwnerCompleted(p);
      return false;
    });
    // Sort: agreed_upon first (need action), then posts with interest, then others
    const postIdsWithInterest = new Set(
      interestSummary.interests.map((i) => i.postId),
    );
    return [...activePosts].sort((a, b) => {
      // Agreed upon posts come first (need action)
      if (a.status === "agreed_upon" && b.status !== "agreed_upon") return -1;
      if (a.status !== "agreed_upon" && b.status === "agreed_upon") return 1;
      // Then posts with interest
      const aHasInterest = postIdsWithInterest.has(a.id);
      const bHasInterest = postIdsWithInterest.has(b.id);
      if (aHasInterest && !bHasInterest) return -1;
      if (!aHasInterest && bHasInterest) return 1;
      return 0;
    });
  };

  const getArchivedPosts = () => {
    // Archive = posts where owner HAS marked complete (ownerCompleted is true)
    // Also include any manually archived posts (status === 'archived')
    return posts.filter((p) => {
      if (p.status === "archived") return true;
      if (p.status === "agreed_upon") return isOwnerCompleted(p);
      return false;
    });
  };

  const tabPosts =
    activeTab === "active" ? getActivePosts() : getArchivedPosts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading your shares...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Shares</h1>

        {/* Inline Share Form */}
        <InlineShareForm
          onSuccess={reloadPosts}
          autoFocus={shouldAutoFocusShare}
        />

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "active"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Active ({getActivePosts().length})
              </button>
              <button
                onClick={() => setActiveTab("archive")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "archive"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Archive ({getArchivedPosts().length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {tabPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {activeTab === "active"
                  ? "No active shares yet. Use the form above to share a book!"
                  : "No archived shares yet."}
              </p>
            </div>
          ) : (
            tabPosts.map((post) => (
              <div
                key={post.id}
                ref={(el) => {
                  if (el) postRefs.current.set(post.id, el);
                  else postRefs.current.delete(post.id);
                }}
                className="transition-all duration-300"
              >
                <ShareCard
                  post={post}
                  onUpdate={reloadPosts}
                  autoFocusThreadId={
                    post.id === focusPostId ? showThreadId ?? undefined : undefined
                  }
                  onAutoFocusComplete={() => {
                    // Clear the URL after focusing (navigate to /share without threadId)
                    if (routeThreadId) {
                      navigate("/share", { replace: true });
                    }
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Post, User } from "@booksharepdx/shared";
import { postService, neighborhoodService } from "../services";
import { useUser } from "../contexts/UserContext";
import PostCard from "../components/PostCard";
import MultiSelectTagInput from "../components/MultiSelectTagInput";
import LoadingSpinner from "../components/LoadingSpinner";
import { calculateDistance, getLocationCoords } from "../utils/distance";
import { useAsync } from "../hooks/useAsync";
  import { filterPosts, sortByDistance } from "../utils/postFilters";                                                                                   
import { GENRES } from "../utils/genres";

const POSTS_PER_PAGE = 10;

export default function BrowsePage() {
  const { currentUser } = useUser();
  const [searchParams] = useSearchParams();
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  // Handle URL parameters
  const targetPostId = searchParams.get("postId");
  const openRequest = searchParams.get("openRequest") === "true";

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useAsync(
    async () => {
      const activePosts = await postService.getActive();
      const userMap = new Map<string, User>();
      activePosts.forEach((p) => {
        if (p.user) userMap.set(p.userId, p.user);
      });
      return { posts: activePosts, users: userMap };
    },
    [],
    { posts: [], users: new Map<string, User>() },
  );

  const { posts, users } = data!;
  // Calculate distance for a post
  const getPostDistance = useCallback(
    (post: Post): number | undefined => {
      if (!currentUser) return undefined;

      const postUser = users.get(post.userId);
      if (!postUser) return undefined;

      const neighborhoods = neighborhoodService.getAll();
      const currentUserCoords = getLocationCoords(
        currentUser.location,
        neighborhoods,
      );
      const postUserCoords = getLocationCoords(
        postUser.location,
        neighborhoods,
      );

      if (!currentUserCoords || !postUserCoords) return undefined;

      return calculateDistance(currentUserCoords, postUserCoords);
    },
    [currentUser, users],
  );

  const [filters, setFilters] = useState({                                                                                                              
    searchTerm: "",                                                                                                                                     
    selectedGenres: [] as string[],                                                                                                                     
    selectedType: "all" as "all" | "giveaway" | "exchange",                                                                                             
    maxDistance: 10,                                                                                                                                    
  });                                                                                                                                                   
                                                                                                                                                        
  const updateFilter = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {                                                          
    setFilters((prev) => ({ ...prev, [key]: value }));                                                                                                  
    setPage(1);                                                                                                                                         
    setInfiniteScrollEnabled(false);                                                                                                                    
  };        

  const filteredPosts = useMemo(() => {                                                                                                                 
    const filtered = filterPosts(posts, {                                                                                                               
      excludeUserId: currentUser?.id,                                                                                                                   
      search: filters.searchTerm,                                                                                                                       
      genres: filters.selectedGenres,                                                                                                                   
      type: filters.selectedType,                                                                                                                       
      maxDistance: filters.maxDistance,                                                                                                                 
      getDistance: getPostDistance,                                                                                                                     
    });                                                                                                                                                 
    return currentUser ? sortByDistance(filtered, getPostDistance) : filtered;                                                                          
  }, [posts, currentUser, filters, getPostDistance]);

  // Paginated view of filtered posts
  const displayedPosts = useMemo(() => {
    return filteredPosts.slice(0, page * POSTS_PER_PAGE);
  }, [filteredPosts, page]);

  // Infinite scroll (only when enabled)
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Only setup observer if infinite scroll is enabled
    if (infiniteScrollEnabled) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (
            target.isIntersecting &&
            !loadingMore &&
            displayedPosts.length < filteredPosts.length
          ) {
            setLoadingMore(true);
            setTimeout(() => {
              setPage((prev) => prev + 1);
              setLoadingMore(false);
            }, 500);
          }
        },
        { threshold: 0.8 },
      );

      if (loadMoreRef.current) {
        observerRef.current.observe(loadMoreRef.current);
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    displayedPosts.length,
    filteredPosts.length,
    loadingMore,
    infiniteScrollEnabled,
  ]);

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      selectedGenres: [],
      selectedType: "all",
      maxDistance: 10,
    });
    setPage(1);
    setInfiniteScrollEnabled(false);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setInfiniteScrollEnabled(true);
      setLoadingMore(false);
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Browse Books</h1>
              <p className="mt-1 text-sm text-gray-600">
                {filteredPosts.length}{" "}
                {filteredPosts.length === 1 ? "book" : "books"} available
              </p>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden btn-secondary"
            >
              <svg
                className="w-5 h-5 mr-2 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside
            className={`lg:w-64 flex-shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}
          >
            <div className="card p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Filters</h2>
                {(filters.searchTerm ||
                  filters.selectedGenres.length > 0 ||
                  filters.selectedType !== "all" ||
                  filters.maxDistance !== 10) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Title or author"
                    value={filters.searchTerm}
                    onChange={(e) => updateFilter("searchTerm", e.target.value)}
                    className="input text-sm"
                  />
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genre
                  </label>
                  <MultiSelectTagInput
                    options={GENRES}
                    selectedTags={filters.selectedGenres}
                    onChange={(genres) => updateFilter("selectedGenres", genres)}
                    placeholder="All Genres"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        checked={filters.selectedType === "all"}
                        onChange={() => updateFilter("selectedType", "all")}
                        className="mr-2"
                      />
                      <span className="text-sm">All</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        checked={filters.selectedType === "giveaway"}
                        onChange={() => updateFilter("selectedType", "giveaway")}
                        className="mr-2"
                      />
                      <span className="text-sm inline-flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        Give Away
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        checked={filters.selectedType === "exchange"}
                        onChange={() => updateFilter("selectedType", "exchange")}
                        className="mr-2"
                      />
                      <span className="text-sm inline-flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                        Exchange
                      </span>
                    </label>
                  </div>
                </div>

                {/* Distance */}
                {currentUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distance: {filters.maxDistance} mi
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={filters.maxDistance}
                      onChange={(e) => updateFilter("maxDistance", Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1 mi</span>
                      <span>10 mi</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Feed */}
          <main className="flex-grow">
            {displayedPosts.length === 0 ? (
              <div className="card p-12 text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No books found
                </h3>
                <p className="text-gray-600 mb-4">
                  {currentUser
                    ? "No books found nearby matching your filters."
                    : "Try adjusting your filters or clearing them."}
                </p>
                {(filters.searchTerm ||
                  filters.selectedGenres.length > 0 ||
                  filters.selectedType !== "all" ||
                  filters.maxDistance !== 10) && (
                  <button onClick={clearFilters} className="btn-primary">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    distance={getPostDistance(post)}
                    autoOpenRequest={post.id === targetPostId && openRequest}
                  />
                ))}

                {/* Load More Trigger */}
                {displayedPosts.length < filteredPosts.length && (
                  <>
                    {!infiniteScrollEnabled ? (
                      // Show button before infinite scroll is enabled
                      <div className="py-8 text-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="btn-primary disabled:opacity-50"
                        >
                          {loadingMore ? (
                            <span className="flex items-center gap-2">
                              <LoadingSpinner
                                size="sm"
                                className="text-white"
                              />
                              Loading...
                            </span>
                          ) : (
                            `Load More (${filteredPosts.length - displayedPosts.length} remaining)`
                          )}
                        </button>
                      </div>
                    ) : (
                      // Show automatic loading trigger after button is clicked
                      <div ref={loadMoreRef} className="py-8 text-center">
                        {loadingMore ? (
                          <LoadingSpinner
                            size="md"
                            className="mx-auto text-primary-600"
                          />
                        ) : (
                          <p className="text-gray-500 text-sm">
                            Scroll for more...
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* End of Results */}
                {displayedPosts.length === filteredPosts.length &&
                  displayedPosts.length > POSTS_PER_PAGE && (
                    <div className="py-8 text-center">
                      <p className="text-gray-500 text-sm">
                        You've reached the end!
                      </p>
                    </div>
                  )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

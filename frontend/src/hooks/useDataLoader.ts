import { useCallback } from "react";
import { userService, postService } from "../services";
import type { User, Post } from "@booksharepdx/shared";
import { useAsync } from "./useAsync";

// NOTE: These hooks intentionally do NOT cache data. Fresh fetches on every mount/change.
// Caching was removed because: (1) stale data bugs are worse than extra API calls,
// (2) no automatic invalidation means users see outdated state after mutations,
// (3) Cloud Run costs are negligible for our traffic volume.
// If you need caching in the future, use React Query or SWR which handle invalidation properly.

export function useUser(userId: string | null | undefined) {
  const fetchUser = useCallback(async () => {
    if (!userId) return null;
    return userService.getById(userId);
  }, [userId]);

  const { data: user, loading, error } = useAsync(fetchUser, [userId], null);
  return { user, loading, error };
}

export function usePost(postId: string | null | undefined) {
  const fetchPost = useCallback(async () => {
    if (!postId) return null;
    return postService.getById(postId);
  }, [postId]);

  const { data: post, loading, error } = useAsync(fetchPost, [postId], null);
  return { post, loading, error };
}

// Batch loader - fetches multiple users in parallel.
// Sorted IDs as dependency prevents refetch when array order changes but content is same.
export function useUsers(userIds: string[]) {
  // Stable key: filter, sort, join - prevents refetch on reorder
  const idsKey = [...userIds].filter(Boolean).sort().join(",");

  const fetchUsers = useCallback(async (): Promise<Record<string, User>> => {
    const filteredIds = userIds.filter(Boolean);
    if (filteredIds.length === 0) return {};

    const results = await Promise.all(
      filteredIds.map((id) =>
        userService.getById(id).then((user) => ({ id, user })),
      ),
    );
    const map: Record<string, User> = {};
    for (const { id, user } of results) {
      if (user) map[id] = user;
    }
    return map;
  }, [idsKey]);

  const { data: users, loading, error } = useAsync(fetchUsers, [idsKey], {});
  return { users: users ?? {}, loading, error };
}

// Batch loader - fetches multiple posts in parallel.
// Sorted IDs as dependency prevents refetch when array order changes but content is same.
export function usePosts(postIds: string[]) {
  // Stable key: filter, sort, join - prevents refetch on reorder
  const idsKey = [...postIds].filter(Boolean).sort().join(",");

  const fetchPosts = useCallback(async (): Promise<Record<string, Post>> => {
    const filteredIds = postIds.filter(Boolean);
    if (filteredIds.length === 0) return {};

    const results = await Promise.all(
      filteredIds.map((id) =>
        postService.getById(id).then((post) => ({ id, post })),
      ),
    );
    const map: Record<string, Post> = {};
    for (const { id, post } of results) {
      if (post) map[id] = post;
    }
    return map;
  }, [idsKey]);

  const { data: posts, loading, error } = useAsync(fetchPosts, [idsKey], {});
  return { posts: posts ?? {}, loading, error };
}

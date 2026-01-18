import { useState, useEffect, useRef } from 'react';
import { userService, postService } from '../services';
import type { User, Post } from '@booksharepdx/shared';

// NOTE: These hooks intentionally do NOT cache data. Fresh fetches on every mount/change.
// Caching was removed because: (1) stale data bugs are worse than extra API calls,
// (2) no automatic invalidation means users see outdated state after mutations,
// (3) Cloud Run costs are negligible for our traffic volume.
// If you need caching in the future, use React Query or SWR which handle invalidation properly.

export function useUser(userId: string | null | undefined) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    setLoading(true);
    setError(null);

    userService.getById(userId)
      .then(setUser)
      .catch(err => {
        console.error(`Failed to load user ${userId}:`, err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
}

export function usePost(postId: string | null | undefined) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      return;
    }

    setLoading(true);
    setError(null);

    postService.getById(postId)
      .then(setPost)
      .catch(err => {
        console.error(`Failed to load post ${postId}:`, err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  return { post, loading, error };
}

// Batch loader - fetches multiple users in parallel.
// The idsRef prevents re-fetching when the array reference changes but content is the same.
// This is NOT caching - it only dedupes within the same component instance.
export function useUsers(userIds: string[]) {
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const idsRef = useRef<string>('');

  useEffect(() => {
    const filteredIds = userIds.filter(Boolean);
    const idsKey = [...filteredIds].sort().join(',');
    if (idsKey === idsRef.current || filteredIds.length === 0) return;
    idsRef.current = idsKey;

    setLoading(true);
    setError(null);

    Promise.all(filteredIds.map(id => userService.getById(id).then(user => ({ id, user }))))
      .then(results => {
        const map: Record<string, User> = {};
        for (const { id, user } of results) {
          if (user) map[id] = user;
        }
        setUsers(map);
      })
      .catch(err => {
        console.error('Failed to load users:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [userIds.join(',')]);

  return { users, loading, error };
}

// Batch loader - fetches multiple posts in parallel.
// The idsRef prevents re-fetching when the array reference changes but content is the same.
// This is NOT caching - it only dedupes within the same component instance.
export function usePosts(postIds: string[]) {
  const [posts, setPosts] = useState<Record<string, Post>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const idsRef = useRef<string>('');

  useEffect(() => {
    const filteredIds = postIds.filter(Boolean);
    const idsKey = [...filteredIds].sort().join(',');
    if (idsKey === idsRef.current || filteredIds.length === 0) return;
    idsRef.current = idsKey;

    setLoading(true);
    setError(null);

    Promise.all(filteredIds.map(id => postService.getById(id).then(post => ({ id, post }))))
      .then(results => {
        const map: Record<string, Post> = {};
        for (const { id, post } of results) {
          if (post) map[id] = post;
        }
        setPosts(map);
      })
      .catch(err => {
        console.error('Failed to load posts:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [postIds.join(',')]);

  return { posts, loading, error };
}

import type { Post } from "@booksharepdx/shared";
import { mapToCanonicalGenres } from "./genres";

export type PostFilters = {
  excludeUserId?: string;
  search?: string;
  genres?: string[];
  type?: "giveaway" | "exchange" | "loan" | "all";
  maxDistance?: number;
  getDistance?: (post: Post) => number | undefined;
};

export function filterPosts(posts: Post[], filters: PostFilters): Post[] {
  let result = posts;

  if (filters.excludeUserId) {
    result = result.filter((p) => p.userId !== filters.excludeUserId);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.book.title.toLowerCase().includes(searchLower) ||
        p.book.author.toLowerCase().includes(searchLower) ||
        p.book.genre?.toLowerCase().includes(searchLower),
    );
  }

  if (filters.genres?.length) {
    result = result.filter((p) => {
      const postGenres = mapToCanonicalGenres(p.book.genre || "");
      return postGenres.some((g) => filters.genres!.includes(g));
    });
  }

  if (filters.type && filters.type !== "all") {
    result = result.filter((p) => p.type === filters.type);
  }

  if (filters.maxDistance && filters.getDistance) {
    result = result.filter((p) => {
      const distance = filters.getDistance!(p);
      return distance === undefined || distance <= filters.maxDistance!;
    });
  }

  return result;
}

export function sortByDistance(
  posts: Post[],
  getDistance: (post: Post) => number | undefined,
): Post[] {
  return [...posts].sort((a, b) => {
    const distA = getDistance(a) ?? Infinity;
    const distB = getDistance(b) ?? Infinity;
    return distA - distB;
  });
}

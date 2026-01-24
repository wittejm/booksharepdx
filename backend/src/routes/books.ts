import { Router } from "express";
import { AppDataSource } from "../config/database.js";
import { Book } from "../entities/Book.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { findSimilarBooks, getBookById } from "../services/bookService.js";

const router = Router();

interface BookSearchResult {
  title: string;
  author: string;
  isbn?: string;
  coverImage?: string;
  genre?: string;
  googleBooksId?: string;
}

// Search Google Books API
async function searchGoogleBooks(
  query: string,
  limit: number,
): Promise<BookSearchResult[]> {
  if (!env.googleBooksApiKey) {
    return [];
  }

  try {
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(limit));
    url.searchParams.set("key", env.googleBooksApiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error("Google Books API error:", response.status);
      return [];
    }

    const data = (await response.json()) as { items?: any[] };
    if (!data.items) return [];

    return data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      return {
        title: info.title || "Unknown Title",
        author: (info.authors || []).join(", ") || "Unknown Author",
        isbn:
          (info.industryIdentifiers || []).find(
            (id: any) => id.type === "ISBN_13",
          )?.identifier ||
          (info.industryIdentifiers || []).find(
            (id: any) => id.type === "ISBN_10",
          )?.identifier,
        coverImage: info.imageLinks?.thumbnail?.replace("http:", "https:"),
        genre: (info.categories || [])[0],
        googleBooksId: item.id,
      };
    });
  } catch (error) {
    console.error("Google Books search error:", error);
    return [];
  }
}

// GET /api/books/search - Search books (Google Books API)
router.get("/search", async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      throw new AppError("Search query required", 400, "VALIDATION_ERROR");
    }

    const bookRepo = AppDataSource.getRepository(Book);

    // 1. Search local database first
    const localBooks = await bookRepo
      .createQueryBuilder("book")
      .where("book.title ILIKE :query OR book.author ILIKE :query", {
        query: `%${query}%`,
      })
      .take(limit)
      .getMany();

    const results: BookSearchResult[] = localBooks.map((b) => ({
      title: b.title,
      author: b.author,
      isbn: b.isbn || undefined,
      coverImage: b.coverImage || undefined,
      genre: b.genre || undefined,
      googleBooksId: b.googleBooksId || undefined,
    }));

    // 2. If not enough local results, search Google Books
    if (results.length < limit) {
      const remaining = limit - results.length;
      const googleResults = await searchGoogleBooks(query, remaining);

      // Add Google results, avoiding duplicates
      for (const result of googleResults) {
        const isDupe = results.some(
          (r) =>
            r.googleBooksId === result.googleBooksId ||
            (r.isbn && r.isbn === result.isbn),
        );
        if (!isDupe) {
          results.push(result);
        }
      }
    }

    // Deduplicate by ISBN or title+author
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const key =
        r.isbn || `${r.title.toLowerCase()}:${r.author.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ data: deduped.slice(0, limit) });
  } catch (error) {
    next(error);
  }
});

// GET /api/books/match - Find similar books for manual entry confirmation
router.get("/match", async (req, res, next) => {
  try {
    const title = (req.query.title as string) || "";
    const author = (req.query.author as string) || "";

    if (!title && !author) {
      return res.json({ data: [] });
    }

    const matches = await findSimilarBooks(title, author);
    res.json({ data: matches });
  } catch (error) {
    next(error);
  }
});

// GET /api/books/:id - Get book by ID
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const book = await getBookById(id);
    if (!book) {
      throw new AppError("Book not found", 404, "NOT_FOUND");
    }

    res.json({ data: book });
  } catch (error) {
    next(error);
  }
});

export default router;

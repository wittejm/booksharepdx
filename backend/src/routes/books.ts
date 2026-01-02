import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Book } from '../entities/Book.js';
import { env } from '../config/env.js';
import { validateQuery } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const searchSchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional(),
});

interface BookSearchResult {
  title: string;
  author: string;
  isbn?: string;
  coverImage?: string;
  genre?: string;
  description?: string;
  externalId?: string;
  externalSource?: string;
}

// Search Google Books API
async function searchGoogleBooks(query: string, limit: number): Promise<BookSearchResult[]> {
  if (!env.googleBooksApiKey) {
    return [];
  }

  try {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', String(limit));
    url.searchParams.set('key', env.googleBooksApiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      return [];
    }

    const data = await response.json() as { items?: any[] };
    if (!data.items) return [];

    return data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      return {
        title: info.title || 'Unknown Title',
        author: (info.authors || []).join(', ') || 'Unknown Author',
        isbn: (info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_13')?.identifier ||
              (info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_10')?.identifier,
        coverImage: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
        genre: (info.categories || [])[0],
        description: info.description,
        externalId: item.id,
        externalSource: 'google',
      };
    });
  } catch (error) {
    console.error('Google Books search error:', error);
    return [];
  }
}

// Search OpenLibrary API
async function searchOpenLibrary(query: string, limit: number): Promise<BookSearchResult[]> {
  try {
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('fields', 'key,title,author_name,isbn,cover_i,subject,first_sentence');

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('OpenLibrary API error:', response.status);
      return [];
    }

    const data = await response.json() as { docs?: any[] };
    if (!data.docs) return [];

    return data.docs.map((doc: any) => ({
      title: doc.title || 'Unknown Title',
      author: (doc.author_name || []).join(', ') || 'Unknown Author',
      isbn: (doc.isbn || [])[0],
      coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
      genre: (doc.subject || [])[0],
      description: Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence,
      externalId: doc.key,
      externalSource: 'openlibrary',
    }));
  } catch (error) {
    console.error('OpenLibrary search error:', error);
    return [];
  }
}

// GET /api/books/search - Search books
router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      throw new AppError('Search query required', 400, 'VALIDATION_ERROR');
    }
    const bookRepo = AppDataSource.getRepository(Book);

    // 1. Search local database first
    const localBooks = await bookRepo
      .createQueryBuilder('book')
      .where('book.title ILIKE :query OR book.author ILIKE :query', { query: `%${query}%` })
      .take(limit)
      .getMany();

    const results: BookSearchResult[] = localBooks.map(b => ({
      title: b.title,
      author: b.author,
      isbn: b.isbn || undefined,
      coverImage: b.coverImage || undefined,
      genre: b.genre || undefined,
      description: b.description || undefined,
      externalId: b.externalId || undefined,
      externalSource: b.externalSource || undefined,
    }));

    // 2. If not enough results, search external APIs
    if (results.length < limit) {
      const remaining = limit - results.length;

      // Try Google Books first
      const googleResults = await searchGoogleBooks(query, remaining);
      results.push(...googleResults);

      // If still not enough, try OpenLibrary
      if (results.length < limit) {
        const stillRemaining = limit - results.length;
        const openLibraryResults = await searchOpenLibrary(query, stillRemaining);
        results.push(...openLibraryResults);
      }

      // Cache new results
      for (const result of googleResults.concat(await searchOpenLibrary(query, remaining))) {
        // Check if already cached
        const existing = await bookRepo.findOne({
          where: [
            { externalId: result.externalId },
            { isbn: result.isbn },
          ],
        });

        if (!existing && result.externalId) {
          const book = bookRepo.create({
            title: result.title,
            author: result.author,
            isbn: result.isbn || null,
            coverImage: result.coverImage || null,
            genre: result.genre || null,
            description: result.description || null,
            externalId: result.externalId,
            externalSource: result.externalSource || null,
          });
          await bookRepo.save(book).catch(() => {}); // Ignore duplicate errors
        }
      }
    }

    // Deduplicate by ISBN or title+author
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      const key = r.isbn || `${r.title.toLowerCase()}:${r.author.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ data: deduped.slice(0, limit) });
  } catch (error) {
    next(error);
  }
});

// GET /api/books/:id - Get book by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookRepo = AppDataSource.getRepository(Book);

    const book = await bookRepo.findOne({ where: { id } });
    if (!book) {
      throw new AppError('Book not found', 404, 'NOT_FOUND');
    }

    res.json({ data: book.toJSON() });
  } catch (error) {
    next(error);
  }
});

export default router;

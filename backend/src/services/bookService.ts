import { ILike } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { Book } from '../entities/Book.js';

export interface BookInput {
  googleBooksId?: string;
  title: string;
  author: string;
  coverImage?: string;
  genre?: string;
  isbn?: string;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeAuthor(author: string): string {
  return author
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Update book metadata when matched.
 * - Fill in missing fields (googleBooksId, isbn, coverImage)
 * - Always update genre (last write wins - community can correct)
 */
async function updateBookMetadata(existing: Book, input: BookInput): Promise<Book> {
  const bookRepo = AppDataSource.getRepository(Book);
  let updated = false;

  if (!existing.googleBooksId && input.googleBooksId) {
    existing.googleBooksId = input.googleBooksId;
    updated = true;
  }
  if (!existing.isbn && input.isbn) {
    existing.isbn = input.isbn;
    updated = true;
  }
  if (!existing.coverImage && input.coverImage) {
    existing.coverImage = input.coverImage;
    updated = true;
  }

  // Genre: always update if provided (last write wins)
  if (input.genre && input.genre !== existing.genre) {
    existing.genre = input.genre;
    updated = true;
  }

  if (updated) {
    return bookRepo.save(existing);
  }
  return existing;
}

/**
 * Find existing book or create new one.
 * Used when user selects from Google Books (has googleBooksId).
 */
export async function findOrCreateBook(input: BookInput): Promise<Book> {
  const bookRepo = AppDataSource.getRepository(Book);

  // Priority 1: googleBooksId (exact match, most reliable)
  if (input.googleBooksId) {
    const byGoogleId = await bookRepo.findOne({
      where: { googleBooksId: input.googleBooksId }
    });
    if (byGoogleId) {
      return updateBookMetadata(byGoogleId, input);
    }
  }

  // Priority 2: ISBN (exact match)
  if (input.isbn) {
    const byIsbn = await bookRepo.findOne({
      where: { isbn: input.isbn }
    });
    if (byIsbn) {
      return updateBookMetadata(byIsbn, input);
    }
  }

  // No googleBooksId or ISBN match: create new book
  const book = bookRepo.create({
    googleBooksId: input.googleBooksId || null,
    isbn: input.isbn || null,
    title: input.title,
    author: input.author,
    coverImage: input.coverImage || null,
    genre: input.genre || null,
    timesGifted: 0,
    timesTraded: 0,
    timesLoaned: 0,
  });

  return bookRepo.save(book);
}

/**
 * Fuzzy search for similar books (used for manual entry confirmation).
 * Returns potential matches for user to confirm.
 */
export async function findSimilarBooks(title: string, author: string): Promise<Book[]> {
  const bookRepo = AppDataSource.getRepository(Book);
  const normalizedTitle = normalizeTitle(title);
  const normalizedAuthor = normalizeAuthor(author);

  // Search by normalized title OR author using ILIKE
  const books = await bookRepo
    .createQueryBuilder('book')
    .where('LOWER(book.title) LIKE :title', { title: `%${normalizedTitle}%` })
    .orWhere('LOWER(book.author) LIKE :author', { author: `%${normalizedAuthor}%` })
    .orderBy('book.timesGifted + book.timesTraded + book.timesLoaned', 'DESC')
    .limit(5)
    .getMany();

  return books;
}

/**
 * Get a book by ID
 */
export async function getBookById(id: string): Promise<Book | null> {
  const bookRepo = AppDataSource.getRepository(Book);
  return bookRepo.findOne({ where: { id } });
}

/**
 * Increment the appropriate sharing counter based on post type
 */
export async function incrementBookCounter(book: Book, postType: 'giveaway' | 'exchange' | 'loan'): Promise<Book> {
  const bookRepo = AppDataSource.getRepository(Book);

  if (postType === 'giveaway') {
    book.timesGifted++;
  } else if (postType === 'exchange') {
    book.timesTraded++;
  } else if (postType === 'loan') {
    book.timesLoaned++;
  }

  return bookRepo.save(book);
}

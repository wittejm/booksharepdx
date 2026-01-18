import { useState, useRef, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { bookService } from '../services';

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    publishedDate?: string;
    categories?: string[];
  };
}

export interface BookSelection {
  googleBooksId?: string;
  title: string;
  author: string;
  coverImage?: string;
  isbn?: string;
  subjects?: string[];
}

interface BookSearchProps {
  onSelect: (book: BookSelection) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function BookSearch({ onSelect, disabled, autoFocus }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Manual entry fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');

  // Manual entry matching
  const [manualMatches, setManualMatches] = useState<Array<{
    id: string;
    googleBooksId?: string;
    title: string;
    author: string;
    coverImage?: string;
    genre?: string;
    isbn?: string;
  }>>([]);
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  const matchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

  // Auto-focus on mount if requested (without scrolling)
  useEffect(() => {
    if (autoFocus && inputRef.current && !showManualEntry) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [autoFocus, showManualEntry]);

  // Fetch matches for manual entry (debounced)
  useEffect(() => {
    if (!showManualEntry) {
      setManualMatches([]);
      return;
    }

    if (matchDebounceRef.current) {
      clearTimeout(matchDebounceRef.current);
    }

    if (manualTitle.length < 2 && manualAuthor.length < 2) {
      setManualMatches([]);
      return;
    }

    matchDebounceRef.current = setTimeout(async () => {
      setIsMatchingLoading(true);
      try {
        const matches = await bookService.match(manualTitle, manualAuthor);
        setManualMatches(matches);
      } catch (error) {
        console.error('Failed to fetch book matches:', error);
        setManualMatches([]);
      } finally {
        setIsMatchingLoading(false);
      }
    }, 500);

    return () => {
      if (matchDebounceRef.current) {
        clearTimeout(matchDebounceRef.current);
      }
    };
  }, [showManualEntry, manualTitle, manualAuthor]);

  // Debounced search function
  const searchBooks = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setSearchPerformed(false);
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    try {
      let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=8`;
      if (apiKey) {
        url += `&key=${apiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setResults(data.items || []);
      setIsOpen(true);
      setFocusedIndex(-1);
    } catch (error) {
      console.error('Google Books search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchBooks(value);
    }, 300);
  };

  // Get ISBN from Google Books data
  const getIsbn = (book: GoogleBook): string | undefined => {
    const identifiers = book.volumeInfo.industryIdentifiers;
    if (!identifiers) return undefined;

    // Prefer ISBN_13 over ISBN_10
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
    if (isbn13) return isbn13.identifier;

    const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
    return isbn10?.identifier;
  };

  // Get cover image URL (use https)
  const getCoverImage = (book: GoogleBook): string | undefined => {
    const imageLinks = book.volumeInfo.imageLinks;
    if (!imageLinks) return undefined;

    // Prefer thumbnail over smallThumbnail, convert to https
    // Note: Don't change zoom level - not all books have higher res available
    const url = imageLinks.thumbnail || imageLinks.smallThumbnail;
    if (!url) return undefined;

    return url.replace('http://', 'https://');
  };

  // Handle book selection
  const handleSelect = (book: GoogleBook) => {
    onSelect({
      googleBooksId: book.id,
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors?.[0] || 'Unknown Author',
      coverImage: getCoverImage(book),
      isbn: getIsbn(book),
      subjects: book.volumeInfo.categories,
    });

    setQuery('');
    setIsOpen(false);
    setResults([]);
    setSearchPerformed(false);
  };

  // Handle selecting an existing book match
  const handleSelectMatch = (match: typeof manualMatches[0]) => {
    onSelect({
      googleBooksId: match.googleBooksId,
      title: match.title,
      author: match.author,
      coverImage: match.coverImage,
      isbn: match.isbn,
    });

    // Reset form
    setManualTitle('');
    setManualAuthor('');
    setManualCoverUrl('');
    setManualMatches([]);
    setShowManualEntry(false);
    setQuery('');
  };

  // Handle manual entry submission
  const handleManualSubmit = () => {
    if (!manualTitle.trim()) return;

    onSelect({
      title: manualTitle.trim(),
      author: manualAuthor.trim() || 'Unknown Author',
      coverImage: manualCoverUrl.trim() || undefined,
    });

    // Reset form
    setManualTitle('');
    setManualAuthor('');
    setManualCoverUrl('');
    setManualMatches([]);
    setShowManualEntry(false);
    setQuery('');
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Manual entry form
  if (showManualEntry) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Enter Book Details</h4>
          <button
            type="button"
            onClick={() => setShowManualEntry(false)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Back to search
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Enter book title"
            className="input"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Author
          </label>
          <input
            type="text"
            value={manualAuthor}
            onChange={(e) => setManualAuthor(e.target.value)}
            placeholder="Enter author name"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cover Image URL <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            type="url"
            value={manualCoverUrl}
            onChange={(e) => setManualCoverUrl(e.target.value)}
            placeholder="https://..."
            className="input"
          />
        </div>

        {/* Show existing book matches */}
        {(isMatchingLoading || manualMatches.length > 0) && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {isMatchingLoading ? 'Searching for matches...' : 'Existing books that match:'}
            </p>
            {isMatchingLoading ? (
              <div className="flex justify-center py-2">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div className="space-y-2">
                {manualMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => handleSelectMatch(match)}
                    className="w-full text-left p-2 flex gap-3 bg-white border border-gray-200 rounded hover:border-primary-400 hover:bg-primary-50 transition-colors"
                  >
                    {match.coverImage ? (
                      <img
                        src={match.coverImage}
                        alt={match.title}
                        className="w-10 h-14 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xs">?</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{match.title}</p>
                      <p className="text-xs text-gray-600 truncate">{match.author}</p>
                      {match.genre && (
                        <p className="text-xs text-gray-500">{match.genre}</p>
                      )}
                    </div>
                    <span className="text-xs text-primary-600 self-center">Use this</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleManualSubmit}
          disabled={!manualTitle.trim()}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {manualMatches.length > 0 ? 'Create New Book Entry' : 'Use This Book'}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a book by title or author..."
          className="input pr-10"
          disabled={disabled}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
          {results.map((book, index) => (
            <button
              key={book.id}
              type="button"
              onClick={() => handleSelect(book)}
              className={`w-full text-left p-3 flex gap-3 hover:bg-gray-50 ${
                index === focusedIndex ? 'bg-primary-50' : ''
              } ${index !== results.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {/* Book cover thumbnail */}
              {book.volumeInfo.imageLinks?.smallThumbnail ? (
                <img
                  src={book.volumeInfo.imageLinks.smallThumbnail.replace('http://', 'https://')}
                  alt={book.volumeInfo.title}
                  className="w-10 h-14 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 text-lg">?</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{book.volumeInfo.title}</p>
                <p className="text-sm text-gray-600 truncate">
                  {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                </p>
                {book.volumeInfo.publishedDate && (
                  <p className="text-xs text-gray-500">{book.volumeInfo.publishedDate.slice(0, 4)}</p>
                )}
              </div>
            </button>
          ))}

          {/* Manual entry option at bottom of results */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setShowManualEntry(true);
              setManualTitle(query);
            }}
            className="w-full text-left p-3 hover:bg-gray-50 border-t border-gray-200 text-primary-600"
          >
            <span className="text-sm">Can't find your book? Enter details manually</span>
          </button>
        </div>
      )}

      {/* No results message with manual entry option */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && searchPerformed && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-gray-600 text-center mb-3">No books found for "{query}"</p>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setShowManualEntry(true);
              setManualTitle(query);
            }}
            className="w-full btn-secondary text-sm"
          >
            Enter book details manually
          </button>
        </div>
      )}

      {/* Manual entry link when not searching */}
      {!isOpen && query.length === 0 && (
        <button
          type="button"
          onClick={() => setShowManualEntry(true)}
          className="mt-2 text-sm text-gray-500 hover:text-primary-600"
        >
          Can't find your book? Enter details manually
        </button>
      )}
    </div>
  );
}

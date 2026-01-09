import { useState, useRef, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
  subject?: string[];
}

export interface BookSelection {
  title: string;
  author: string;
  coverImage?: string;
  isbn?: string;
  subjects?: string[];
}

interface OpenLibraryBookSearchProps {
  onSelect: (book: BookSelection) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OpenLibraryBookSearch({ onSelect, disabled, autoFocus }: OpenLibraryBookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenLibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced search function
  const searchBooks = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=8&fields=key,title,author_name,cover_i,isbn,first_publish_year,subject`
      );
      const data = await response.json();
      setResults(data.docs || []);
      setIsOpen(true);
      setFocusedIndex(-1);
    } catch (error) {
      console.error('Open Library search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Handle book selection
  const handleSelect = (book: OpenLibraryBook) => {
    const coverImage = book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
      : undefined;

    onSelect({
      title: book.title,
      author: book.author_name?.[0] || 'Unknown Author',
      coverImage,
      isbn: book.isbn?.[0],
      subjects: book.subject?.slice(0, 20), // Limit to first 20 subjects
    });

    setQuery('');
    setIsOpen(false);
    setResults([]);
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
              key={book.key}
              type="button"
              onClick={() => handleSelect(book)}
              className={`w-full text-left p-3 flex gap-3 hover:bg-gray-50 ${
                index === focusedIndex ? 'bg-primary-50' : ''
              } ${index !== results.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {/* Book cover thumbnail */}
              {book.cover_i ? (
                <img
                  src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                  alt={book.title}
                  className="w-10 h-14 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 text-lg">?</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{book.title}</p>
                <p className="text-sm text-gray-600 truncate">
                  {book.author_name?.join(', ') || 'Unknown Author'}
                </p>
                {book.first_publish_year && (
                  <p className="text-xs text-gray-500">{book.first_publish_year}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No books found for "{query}"
        </div>
      )}
    </div>
  );
}

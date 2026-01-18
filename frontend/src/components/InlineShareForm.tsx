import { useState, useRef } from 'react';
import { postService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from './useToast';
import ToastContainer from './ToastContainer';
import LoadingSpinner from './LoadingSpinner';
import BookSearch, { type BookSelection } from './BookSearch';
import MultiSelectTagInput from './MultiSelectTagInput';
import { GENRES, mapSubjectsToGenres } from '../utils/genres';

interface InlineShareFormProps {
  onSuccess?: () => void;
  autoFocus?: boolean;
}

export default function InlineShareForm({ onSuccess, autoFocus }: InlineShareFormProps) {
  const { currentUser } = useUser();
  const { showToast, toasts, dismiss } = useToast();

  // Step tracking: 'collapsed' | 'search' | 'details' | 'submitting'
  const [step, setStep] = useState<'collapsed' | 'search' | 'details' | 'submitting'>(
    autoFocus ? 'search' : 'collapsed'
  );

  // Selected book data
  const [selectedBook, setSelectedBook] = useState<BookSelection | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Share type
  const [shareType, setShareType] = useState<'giveaway' | 'exchange' | 'loan'>('giveaway');
  const [loanDuration, setLoanDuration] = useState<number>(30); // default 30 days

  // UI state
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  const handleBookSelect = (book: BookSelection) => {
    setSelectedBook(book);
    // Auto-detect genres from Google Books categories
    const autoGenres = mapSubjectsToGenres(book.subjects);
    setSelectedGenres(autoGenres);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!currentUser || !selectedBook) return;

    try {
      setStep('submitting');
      setLoading(true);

      await postService.create({
        book: {
          googleBooksId: selectedBook.googleBooksId,
          title: selectedBook.title,
          author: selectedBook.author,
          genre: selectedGenres.length > 0 ? selectedGenres.join(', ') : undefined,
          isbn: selectedBook.isbn,
          coverImage: selectedBook.coverImage,
        },
        type: shareType,
        ...(shareType === 'loan' && { loanDuration }),
      });

      showToast('Book shared successfully!', 'success');

      // Reset form
      setSelectedBook(null);
      setSelectedGenres([]);
      setStep('collapsed');
      setShareType('giveaway');
      setLoanDuration(30);

      onSuccess?.();
    } catch (err) {
      console.error('Failed to share book:', err);
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      showToast(`Failed to share: ${message}`, 'error');
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedBook(null);
    setSelectedGenres([]);
    setStep('collapsed');
  };

  if (!currentUser) return null;

  return (
    <div ref={formRef} className="mb-6">
      {/* Collapsed state - just show the button */}
      {step === 'collapsed' && (
        <>
          {/* Mobile: full-width prominent button */}
          <button
            onClick={() => setStep('search')}
            className="md:hidden w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Share a Book
          </button>
          {/* Desktop: compact button aligned left */}
          <button
            onClick={() => setStep('search')}
            className="hidden md:inline-flex btn-primary text-sm py-1.5 px-4 items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Share a Book
          </button>
        </>
      )}

      {/* Expanded form */}
      {step !== 'collapsed' && (
        <div className="card p-6">
          {/* Step 1: Search for book */}
          {step === 'search' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Share a Book</h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <BookSearch
                onSelect={handleBookSelect}
                disabled={loading}
                autoFocus={autoFocus || step === 'search'}
              />
            </div>
          )}

          {/* Step 2: Genre and type selection combined */}
          {step === 'details' && selectedBook && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Share Details</h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Book preview */}
              <div className="flex gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                {selectedBook.coverImage ? (
                  <img
                    src={selectedBook.coverImage}
                    alt={selectedBook.title}
                    className="w-16 h-24 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-2xl">?</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{selectedBook.title}</p>
                  <p className="text-sm text-gray-600 truncate">{selectedBook.author}</p>
                </div>
              </div>

              {/* Type selection */}
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setShareType('giveaway')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    shareType === 'giveaway'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Gift</div>
                  <div className="text-xs text-gray-500">Give away for free</div>
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('exchange')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    shareType === 'exchange'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Exchange</div>
                  <div className="text-xs text-gray-500">Trade for another book</div>
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('loan')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    shareType === 'loan'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Loan</div>
                  <div className="text-xs text-gray-500">Lend temporarily</div>
                </button>
              </div>

              {/* Loan duration dropdown */}
              {shareType === 'loan' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Duration</label>
                  <select
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(Number(e.target.value))}
                    className="input w-full"
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Borrowers can request longer if needed
                  </p>
                </div>
              )}

              {/* Genre multi-select */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Genres (optional)</label>
                <MultiSelectTagInput
                  options={GENRES}
                  selectedTags={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Select genres..."
                />
              </div>

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full btn-primary py-3 text-lg font-semibold"
              >
                Share Book
              </button>
            </div>
          )}

          {/* Step 4: Submitting */}
          {step === 'submitting' && (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-600">Sharing your book...</p>
            </div>
          )}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

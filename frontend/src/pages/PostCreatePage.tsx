import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/dataService';
import { useUser } from '../contexts/UserContext';
import Toast from '../components/Toast';

// Common book genres
const GENRES = [
  'Literary Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Romance',
  'Historical Fiction',
  'Horror',
  'Young Adult',
  'Middle Grade',
  'Memoir',
  'Biography',
  'History',
  'Philosophy',
  'Psychology',
  'Science',
  'Self-Help',
  'Poetry',
  'Graphic Novel',
  'Comics',
  'Classics',
  'Contemporary Fiction',
  'Adventure',
  'Travel',
  'Food & Cooking',
  'True Crime',
  'Non-Fiction',
  'Environmental',
  'Social Justice',
  'Spirituality',
  'Nature',
  'Short Stories',
  'Other',
].sort();

export default function PostCreatePage() {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [isbn, setIsbn] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [exchangeType, setExchangeType] = useState<'giveaway' | 'exchange'>('giveaway');
  const [notes, setNotes] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Redirect if not logged in
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleCoverImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, coverImage: 'Image must be less than 5MB' });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, coverImage: 'File must be an image' });
        return;
      }

      setCoverImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Clear error
      const newErrors = { ...errors };
      delete newErrors.coverImage;
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!author.trim()) {
      newErrors.author = 'Author is required';
    }

    if (!genre) {
      newErrors.genre = 'Genre is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    try {
      setLoading(true);

      // Determine cover image to use
      let coverImage: string | undefined;
      if (coverImagePreview) {
        // Use uploaded file (base64)
        coverImage = coverImagePreview;
      } else if (coverImageUrl.trim()) {
        // Use URL
        coverImage = coverImageUrl.trim();
      }

      // Create post
      const post = await postService.create({
        userId: currentUser.id,
        book: {
          title: title.trim(),
          author: author.trim(),
          genre: genre,
          isbn: isbn.trim() || undefined,
          coverImage,
        },
        type: exchangeType,
        notes: notes.trim() || undefined,
        status: 'active',
      });

      setToast({ message: 'Post created successfully!', type: 'success' });

      // Redirect to profile after a short delay
      setTimeout(() => {
        navigate(`/profile/${currentUser.username}`);
      }, 1000);

    } catch (err) {
      console.error('Failed to create post:', err);
      setToast({ message: 'Failed to create post. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-primary-600 hover:text-primary-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
          <p className="text-gray-600 mt-2">Share a book with the BookSharePDX community</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 md:p-8">
          {/* Book Information Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Book Information</h2>

            {/* Title */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) {
                    const newErrors = { ...errors };
                    delete newErrors.title;
                    setErrors(newErrors);
                  }
                }}
                placeholder="The Great Gatsby"
                className={`input ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Author */}
            <div className="mb-4">
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="author"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (errors.author) {
                    const newErrors = { ...errors };
                    delete newErrors.author;
                    setErrors(newErrors);
                  }
                }}
                placeholder="F. Scott Fitzgerald"
                className={`input ${errors.author ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              />
              {errors.author && <p className="text-red-500 text-sm mt-1">{errors.author}</p>}
            </div>

            {/* Genre */}
            <div className="mb-4">
              <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-2">
                Genre <span className="text-red-500">*</span>
              </label>
              <select
                id="genre"
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  if (errors.genre) {
                    const newErrors = { ...errors };
                    delete newErrors.genre;
                    setErrors(newErrors);
                  }
                }}
                className={`input ${errors.genre ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              >
                <option value="">Select a genre...</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {errors.genre && <p className="text-red-500 text-sm mt-1">{errors.genre}</p>}
            </div>

            {/* ISBN (optional) */}
            <div className="mb-4">
              <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-2">
                ISBN (optional)
              </label>
              <input
                type="text"
                id="isbn"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="9780743273565"
                className="input"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">The book's ISBN number, if available</p>
            </div>

            {/* Cover Image */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image (optional)
              </label>

              {/* Image preview */}
              {coverImagePreview && (
                <div className="mb-4">
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-32 h-48 object-cover rounded-lg shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImagePreview('');
                      setCoverImageFile(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-700 mt-2"
                  >
                    Remove image
                  </button>
                </div>
              )}

              {/* File upload */}
              <div className="mb-3">
                <label className="block">
                  <span className="btn-secondary cursor-pointer inline-block">
                    <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageFileChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>

              {/* OR divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* URL input */}
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => {
                  setCoverImageUrl(e.target.value);
                  // Clear file upload if URL is entered
                  if (e.target.value.trim()) {
                    setCoverImagePreview('');
                    setCoverImageFile(null);
                  }
                }}
                placeholder="https://example.com/cover.jpg"
                className="input"
                disabled={loading || !!coverImagePreview}
              />
              {errors.coverImage && <p className="text-red-500 text-sm mt-1">{errors.coverImage}</p>}
              <p className="text-sm text-gray-500 mt-1">Enter a URL to a cover image online</p>
            </div>
          </div>

          {/* Exchange Type Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Exchange Type</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="exchange-type"
                  value="giveaway"
                  checked={exchangeType === 'giveaway'}
                  onChange={(e) => setExchangeType(e.target.value as 'giveaway')}
                  className="mt-1 w-5 h-5 text-primary-600"
                  disabled={loading}
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Give Away</div>
                  <div className="text-sm text-gray-600">
                    Give this book away for free to anyone interested
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="exchange-type"
                  value="exchange"
                  checked={exchangeType === 'exchange'}
                  onChange={(e) => setExchangeType(e.target.value as 'exchange')}
                  className="mt-1 w-5 h-5 text-primary-600"
                  disabled={loading}
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Exchange</div>
                  <div className="text-sm text-gray-600">
                    Trade this book for another book
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Notes Section */}
          <div className="mb-8">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the book's condition, what you're looking for in an exchange, etc."
              className="input resize-none"
              rows={4}
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Share details about condition, what you're looking for in an exchange, or why you loved this book
            </p>
          </div>

          {/* Submit buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Post...
                </span>
              ) : (
                'Create Post'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          id="post-create-toast"
          message={toast.message}
          type={toast.type}
          duration={3000}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

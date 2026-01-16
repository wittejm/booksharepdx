// Canonical list of genres for the app
export const GENRES = [
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

// Map API subjects/labels to our canonical genres
const SUBJECT_TO_GENRE: Record<string, string> = {
  'fiction': 'Literary Fiction',
  'literary fiction': 'Literary Fiction',
  'science fiction': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  'fantasy': 'Fantasy',
  'fantasy fiction': 'Fantasy',
  'mystery': 'Mystery',
  'mystery fiction': 'Mystery',
  'detective': 'Mystery',
  'thriller': 'Thriller',
  'thrillers': 'Thriller',
  'suspense': 'Thriller',
  'romance': 'Romance',
  'love stories': 'Romance',
  'historical fiction': 'Historical Fiction',
  'historical': 'Historical Fiction',
  'horror': 'Horror',
  'horror fiction': 'Horror',
  'young adult': 'Young Adult',
  'ya': 'Young Adult',
  'juvenile fiction': 'Middle Grade',
  'children': 'Middle Grade',
  "children's fiction": 'Middle Grade',
  'memoir': 'Memoir',
  'memoirs': 'Memoir',
  'autobiography': 'Memoir',
  'biography': 'Biography',
  'biographies': 'Biography',
  'history': 'History',
  'philosophy': 'Philosophy',
  'psychology': 'Psychology',
  'science': 'Science',
  'popular science': 'Science',
  'self-help': 'Self-Help',
  'self help': 'Self-Help',
  'personal development': 'Self-Help',
  'poetry': 'Poetry',
  'poems': 'Poetry',
  'graphic novels': 'Graphic Novel',
  'graphic novel': 'Graphic Novel',
  'comics': 'Comics',
  'comic books': 'Comics',
  'classics': 'Classics',
  'classic literature': 'Classics',
  'adventure': 'Adventure',
  'adventure fiction': 'Adventure',
  'travel': 'Travel',
  'cooking': 'Food & Cooking',
  'cookbooks': 'Food & Cooking',
  'food': 'Food & Cooking',
  'true crime': 'True Crime',
  'nonfiction': 'Non-Fiction',
  'non-fiction': 'Non-Fiction',
  'environment': 'Environmental',
  'environmental': 'Environmental',
  'nature': 'Nature',
  'social issues': 'Social Justice',
  'spirituality': 'Spirituality',
  'religion': 'Spirituality',
  'short stories': 'Short Stories',
};

// Also map our canonical genres to themselves (for exact matches)
for (const genre of GENRES) {
  SUBJECT_TO_GENRE[genre.toLowerCase()] = genre;
}

/**
 * Map a genre string (possibly comma-separated) to canonical genres.
 * Returns only genres that exist in our canonical list.
 */
export function mapToCanonicalGenres(genreString: string): string[] {
  if (!genreString) return [];

  const matchedGenres = new Set<string>();

  // Split by comma or slash
  const parts = genreString.split(/[,\/]/).map(g => g.trim()).filter(Boolean);

  for (const part of parts) {
    const lower = part.toLowerCase();

    // Direct match
    if (SUBJECT_TO_GENRE[lower]) {
      matchedGenres.add(SUBJECT_TO_GENRE[lower]);
      continue;
    }

    // Partial match - check if any key is contained in the part
    for (const [key, genre] of Object.entries(SUBJECT_TO_GENRE)) {
      if (lower.includes(key)) {
        matchedGenres.add(genre);
      }
    }
  }

  return Array.from(matchedGenres);
}

/**
 * Map Google Books categories array to canonical genres.
 * Used when selecting a book from search results.
 */
export function mapSubjectsToGenres(subjects: string[] | undefined): string[] {
  if (!subjects) return [];

  const matchedGenres = new Set<string>();

  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    // Direct match
    if (SUBJECT_TO_GENRE[lower]) {
      matchedGenres.add(SUBJECT_TO_GENRE[lower]);
    }
    // Partial match - check if any key is contained in the subject
    for (const [key, genre] of Object.entries(SUBJECT_TO_GENRE)) {
      if (lower.includes(key)) {
        matchedGenres.add(genre);
      }
    }
  }

  return Array.from(matchedGenres).slice(0, 5); // Limit to 5 genres
}

import { useState } from 'react';

interface GenreDisplayProps {
  genre?: string;
  className?: string;
}

/**
 * GenreDisplay - Displays book genres with expand/collapse for multiple genres
 * Parses comma or slash-separated genres and shows first with "..." if multiple
 */
export default function GenreDisplay({ genre, className = '' }: GenreDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!genre) {
    return null;
  }

  const genres = genre.split(/[,\/]/).map(g => g.trim()).filter(Boolean);

  if (genres.length === 0) {
    return null;
  }

  if (genres.length === 1) {
    return <span className={className}>{genres[0]}</span>;
  }

  if (expanded) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
        className={`cursor-pointer hover:text-gray-700 ${className}`}
      >
        {genres.join(', ')}
      </span>
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
      className={`cursor-pointer hover:text-gray-700 ${className}`}
    >
      {genres[0]}
      <span className="ml-1 text-gray-400">...</span>
    </span>
  );
}

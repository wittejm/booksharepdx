import type { BookInfo } from "@booksharepdx/shared";
import GenreDisplay from "./GenreDisplay";

interface BookDisplayProps {
  book: BookInfo;
  type?: "giveaway" | "exchange" | "loan";
  status?: "active" | "agreed_upon" | "archived";
  showTypeBadge?: boolean;
  children?: React.ReactNode; // For additional badges or buttons
}

/**
 * BookDisplay - Shared component for displaying book info (cover, title, author, genre)
 * Used by PostCard and ShareCard to avoid duplicate markup
 */
export default function BookDisplay({
  book,
  type,
  status,
  showTypeBadge = true,
  children,
}: BookDisplayProps) {
  return (
    <div className="flex gap-4">
      {/* Book Cover */}
      <div className="flex-shrink-0">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-24 h-36 md:w-32 md:h-48 object-cover rounded shadow-sm"
          />
        ) : (
          <div className="w-24 h-36 md:w-32 md:h-48 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-400 text-xs text-center px-2">
              No Cover
            </span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="flex-grow min-w-0">
        <h3 className="font-bold text-lg text-gray-900 pr-8">{book.title}</h3>
        <p className="text-gray-600 text-sm pr-8">{book.author}</p>

        {/* Genre */}
        <p className="text-sm text-gray-500 mt-1">
          <GenreDisplay genre={book.genre} />
        </p>

        {/* Type Badge */}
        {showTypeBadge && type && (
          <div className="flex items-center gap-2 mt-2">
            <TypeBadge type={type} />
            {status === "archived" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Archived
              </span>
            )}
          </div>
        )}

        {/* Children slot for additional content (user info, request buttons, etc.) */}
        {children}
      </div>
    </div>
  );
}

export function TypeBadge({
  type,
}: {
  type: "giveaway" | "exchange" | "loan";
}) {
  if (type === "giveaway") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Give Away
      </span>
    );
  }
  if (type === "exchange") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Exchange
      </span>
    );
  }
  // loan
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
      Loan
    </span>
  );
}

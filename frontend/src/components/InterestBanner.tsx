import { Link } from 'react-router-dom';
import { useInterest } from '../contexts/InterestContext';
import { useUser } from '../contexts/UserContext';
import { numberToWords } from '../utils/numberToWords';

export default function InterestBanner() {
  const { currentUser } = useUser();
  const { summary } = useInterest();

  // Only show for logged-in users with active interest
  if (!currentUser || summary.totalCount === 0) {
    return null;
  }

  // Generate the appropriate message based on people and books counts
  const getMessage = () => {
    const { uniquePeople, uniquePosts } = summary;

    if (uniquePeople === 1) {
      if (uniquePosts === 1) {
        return 'Someone is interested in one of your shared books';
      } else {
        return 'Someone is interested in some of your shared books';
      }
    } else {
      const peopleWord = numberToWords(uniquePeople);
      if (uniquePosts === 1) {
        return `${peopleWord} neighbors are interested in one of your shared books`;
      } else {
        return `${peopleWord} neighbors are interested in your shared books`;
      }
    }
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <Link
          to="/share?scrollToInterest=true"
          className="flex items-center gap-3 text-blue-800 hover:text-blue-900 transition-colors group"
        >
          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
            {summary.totalCount}
          </span>
          <span className="text-sm font-medium group-hover:underline">
            {getMessage()}
          </span>
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

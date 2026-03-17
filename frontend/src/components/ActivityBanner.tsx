import { Link } from "react-router-dom";
import { useActivity } from "../contexts/ActivityContext";
import { useUser } from "../contexts/UserContext";

export default function ActivityBanner() {
  const { currentUser } = useUser();
  const { summary } = useActivity();

  const { acceptedGiftCount, acceptedTradeCount } = summary;
  const totalAccepted = acceptedGiftCount + acceptedTradeCount;

  // Only show for logged-in users with accepted requests
  if (!currentUser || totalAccepted === 0) {
    return null;
  }

  const getMessage = () => {
    if (acceptedGiftCount > 0 && acceptedTradeCount === 0) {
      if (acceptedGiftCount === 1) {
        return "Your gift request was accepted — mark it as received";
      }
      return "Your gift requests were accepted — mark them as received";
    }
    if (acceptedTradeCount > 0 && acceptedGiftCount === 0) {
      if (acceptedTradeCount === 1) {
        return "Your trade request was accepted — mark it as completed";
      }
      return "Your trade requests were accepted — mark them as completed";
    }
    return "You have accepted requests awaiting completion";
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <Link
          to="/activity"
          className="flex items-center gap-3 text-blue-800 hover:text-blue-900 transition-colors group"
        >
          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
            {totalAccepted}
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

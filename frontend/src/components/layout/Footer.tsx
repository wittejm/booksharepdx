import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../Modal";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleSubmitReport = () => {
    // For now, just show confirmation - could integrate with Discord webhook or email later
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportText("");
      setReportSubmitted(false);
    }, 2000);
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            &copy; {currentYear} BookSharePDX
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <a
              href="https://discord.gg/KsN2rapS"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.396-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.975 14.975 0 0 0 1.293-2.1a.07.07 0 0 0-.038-.098a13.11 13.11 0 0 1-1.872-.892a.072.072 0 0 1-.007-.12a10.513 10.513 0 0 0 .372-.294a.074.074 0 0 1 .076-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .076.01c.12.098.246.198.373.294a.072.072 0 0 1-.006.12a12.265 12.265 0 0 1-1.873.892a.077.077 0 0 0-.041.098c.36.698.772 1.362 1.293 2.1a.074.074 0 0 0 .084.028a19.963 19.963 0 0 0 6.002-3.03a.079.079 0 0 0 .033-.057c.5-4.467-.838-8.343-3.554-11.807a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156c0-1.193.964-2.157 2.157-2.157c1.193 0 2.157.964 2.157 2.157c0 1.191-.964 2.156-2.157 2.156zm7.975 0c-1.183 0-2.157-.965-2.157-2.156c0-1.193.964-2.157 2.157-2.157c1.193 0 2.157.964 2.157 2.157c0 1.191-.964 2.156-2.157 2.156z" />
              </svg>
              Discord
            </a>
            <Link
              to="/about"
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
            >
              About
            </Link>
            <a
              href="https://github.com/wittejm/booksharepdx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
            >
              GitHub
            </a>
            <button
              onClick={() => setShowReportModal(true)}
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
            >
              Report a problem
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportText("");
          setReportSubmitted(false);
        }}
        title="Report a Problem"
        size="md"
      >
        {reportSubmitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">Thanks for the feedback!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Found a bug or having an issue with another user? Let us know. You can also reach us
              on{" "}
              <a
                href="https://discord.gg/KsN2rapS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Discord
              </a>
              .
            </p>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe the problem or share your feedback..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportText("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportText.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </footer>
  );
}

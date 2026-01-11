import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              &copy; {currentYear} BookSharePDX
            </p>
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <Link
                to="/about"
                className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                About
              </Link>
              <a
                href="https://github.com/pdxbookshare"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                GitHub
              </a>
            </div>
        </div>
      </div>
    </footer>
  );
}

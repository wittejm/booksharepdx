import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="bg-white">
      <section className="bg-gradient-to-br from-primary-50 to-warm-50 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-4">
            404
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            We couldn't find that page. It may have been moved or no longer
            exists.
          </p>
          <Link
            to="/browse"
            className="inline-block bg-primary-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Browse Books
          </Link>
        </div>
      </section>
    </div>
  );
}

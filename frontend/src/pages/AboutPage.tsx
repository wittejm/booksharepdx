import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUser } from "../contexts/UserContext";

export default function AboutPage() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const { currentUser } = useUser();
  const location = useLocation();

  // Scroll to anchor on page load
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView();
      });
    }
  }, [location.hash]);

  const faqs = [
    {
      id: "safety",
      question: "Is it safe to meet with strangers?",
      answer:
        "Yes! BookSharePDX is built with safety in mind. We recommend meeting in public places during daylight hours, and you can communicate through our messaging system before meeting. You can also verify other users and read reviews from community members. If you ever feel uncomfortable, you can block users and report concerning behavior.",
    },
    {
      id: "verification",
      question: "How does user verification work?",
      answer:
        "All users must provide a valid email address when signing up. We encourage community members to build trust through positive interactions and mutual recommendations. Our community guidelines ensure everyone is held to the same high standards of respect and safety.",
    },
    {
      id: "books",
      question: "What kinds of books can I share?",
      answer:
        "You can share any books you'd like to lend or give away - fiction, non-fiction, textbooks, children's books, and more. We do ask that books are in readable condition. Books with severe damage or extensive wear may not be suitable for sharing.",
    },
    {
      id: "cost",
      question: "Is there a cost to use BookSharePDX?",
      answer:
        "BookSharePDX is completely free to use! There are no fees for listing books, messaging neighbors, or arranging exchanges. We're a community-driven platform dedicated to sharing books and building connections.",
    },
    {
      id: "location",
      question: "Can I share books outside my neighborhood?",
      answer:
        "Yes! While we organize books by Portland neighborhoods, you can browse books from nearby areas and arrange meetups that work for both parties. You can specify your preferred meeting locations when listing a book.",
    },
    {
      id: "borrowed",
      question: "What if I want to borrow a book?",
      answer:
        'You can search for books with "Trade" status or message the book owner directly to arrange a lending arrangement. Some books are offered for free, while others are available for trade. It\'s up to each community member to decide their terms.',
    },
    {
      id: "guidelines",
      question: "What are the community guidelines?",
      answer:
        "We ask all members to be respectful, honest, and considerate. Books should be as described, meetups should happen as planned, and all communication should be friendly. We have a moderation team that reviews reports and takes action against bad actors. Repeated violations can result in account suspension or banning.",
    },
    {
      id: "delete",
      question: "Can I delete my account?",
      answer:
        "Yes, you can delete your account at any time through your account settings. Your past activity will remain visible for community records, but your personal information will be removed. If you have active book exchanges, we recommend completing them first.",
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-warm-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            About BookSharePDX
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Building a community where books bring neighbors together.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                BookSharePDX exists to foster meaningful connections within
                Portland's neighborhoods through the simple act of sharing
                books.
              </p>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                We believe that:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">📚</span>
                  <span>
                    Books should be read and enjoyed, not gathering dust on
                    shelves
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">🤝</span>
                  <span>
                    Sharing creates stronger neighborhoods and genuine
                    friendships
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">🌱</span>
                  <span>Sustainable sharing reduces waste and consumption</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">💚</span>
                  <span>
                    Local communities are the foundation of a better world
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-warm-100 rounded-lg p-12 flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-8xl mb-4">📖</div>
                <p className="text-gray-700 font-semibold">
                  Sharing Knowledge. Building Community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team/Credits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Built by the Community
          </h2>

          <div className="bg-gradient-to-br from-primary-50 to-warm-50 rounded-lg p-12">
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              BookSharePDX was created with a simple vision: to make it easy for
              neighbors to share books and build community. While we may be a
              small team, we're inspired by and built for the vibrant Portland
              community.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              This platform stands on the shoulders of open-source communities,
              the accessibility of modern web technology, and most importantly,
              the generosity and goodwill of book lovers everywhere.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Have ideas for how we can improve? Love what we're building? We'd
              love to hear from you at{" "}
              <a
                href="mailto:hello@booksharepdx.com"
                className="text-primary-600 font-semibold hover:text-primary-700"
              >
                hello@booksharepdx.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Community Guidelines Section */}
      <section id="community-guidelines" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Community Guidelines
          </h2>

          <div className="bg-white rounded-lg p-8 shadow-md">
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Be kind and respectful. We're all here to share books and build
              community together, and that only works when everyone feels
              welcome.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Harassment, discrimination, scams, and dishonest behavior will not
              be tolerated and may result in account suspension or permanent
              bans.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              If you experience or witness behavior that violates these
              guidelines, please report it. We review all reports and take
              action to keep our community safe.
            </p>
          </div>
        </div>
      </section>

      {/* Data policy */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Data Policy
          </h2>

          <div className="bg-gradient-to-br from-primary-50 to-warm-50 rounded-lg p-8">
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              We don't sell your data!
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              You can delete any of your posts or messages and they are gone
              forever.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              You can delete your account, and optionally delete all of your old
              posts and messages when you do.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Have questions or feedback? We'd love to hear from you.
          </p>

          <div className="bg-gradient-to-br from-primary-50 to-warm-50 rounded-lg p-12 mb-8">
            <p className="text-lg text-gray-700 mb-6">Email us at:</p>
            <a
              href="mailto:hello@booksharepdx.com"
              className="inline-block text-3xl font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
              hello@booksharepdx.com
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section - only show for logged out users */}
      {!currentUser && (
        <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Start Sharing?</h2>
            <p className="text-lg text-primary-100 mb-8">
              Join thousands of Portlanders building community through books.
            </p>
            <Link
              to="/signup"
              className="inline-block bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Create Your Account
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

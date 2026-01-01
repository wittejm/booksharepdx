import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function AboutPage() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const faqs = [
    {
      id: 'safety',
      question: 'Is it safe to meet with strangers?',
      answer: 'Yes! BookSharePDX is built with safety in mind. We recommend meeting in public places during daylight hours, and you can communicate through our messaging system before meeting. You can also verify other users and read reviews from community members. If you ever feel uncomfortable, you can block users and report concerning behavior.',
    },
    {
      id: 'verification',
      question: 'How does user verification work?',
      answer: 'All users must provide a valid email address when signing up. We encourage community members to build trust through positive interactions and mutual recommendations. Our community guidelines ensure everyone is held to the same high standards of respect and safety.',
    },
    {
      id: 'books',
      question: 'What kinds of books can I share?',
      answer: 'You can share any books you\'d like to lend or give away - fiction, non-fiction, textbooks, children\'s books, and more. We do ask that books are in readable condition. Books with severe damage or extensive wear may not be suitable for sharing.',
    },
    {
      id: 'cost',
      question: 'Is there a cost to use BookSharePDX?',
      answer: 'BookSharePDX is completely free to use! There are no fees for listing books, messaging neighbors, or arranging exchanges. We\'re a community-driven platform dedicated to sharing books and building connections.',
    },
    {
      id: 'location',
      question: 'Can I share books outside my neighborhood?',
      answer: 'Yes! While we organize books by Portland neighborhoods, you can browse books from nearby areas and arrange meetups that work for both parties. You can specify your preferred meeting locations when listing a book.',
    },
    {
      id: 'borrowed',
      question: 'What if I want to borrow a book?',
      answer: 'You can search for books with "Trade" status or message the book owner directly to arrange a lending arrangement. Some books are offered for free, while others are available for trade. It\'s up to each community member to decide their terms.',
    },
    {
      id: 'guidelines',
      question: 'What are the community guidelines?',
      answer: 'We ask all members to be respectful, honest, and considerate. Books should be as described, meetups should happen as planned, and all communication should be friendly. We have a moderation team that reviews reports and takes action against bad actors. Repeated violations can result in account suspension or banning.',
    },
    {
      id: 'delete',
      question: 'Can I delete my account?',
      answer: 'Yes, you can delete your account at any time through your account settings. Your past activity will remain visible for community records, but your personal information will be removed. If you have active book exchanges, we recommend completing them first.',
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
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                BookSharePDX exists to foster meaningful connections within Portland's neighborhoods through the simple act of sharing books.
              </p>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                We believe that:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">📚</span>
                  <span>Books should be read and enjoyed, not gathering dust on shelves</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">🤝</span>
                  <span>Sharing creates stronger neighborhoods and genuine friendships</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">🌱</span>
                  <span>Sustainable sharing reduces waste and consumption</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-2xl">💚</span>
                  <span>Local communities are the foundation of a better world</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-warm-100 rounded-lg p-12 flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-8xl mb-4">📖</div>
                <p className="text-gray-700 font-semibold">Sharing Knowledge. Building Community.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Detail Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">How BookSharePDX Works</h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-primary-600">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    1
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Create Your Account</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Sign up with your email address and create a profile. Tell the community about yourself - what kinds of books you love, what neighborhood you're in, and what brought you to BookSharePDX. This helps you connect with like-minded neighbors.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-primary-600">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    2
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">List Your Books</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Share books you'd like to pass along. Upload photos, add details like title and author, write a brief description, and let neighbors know if you're giving it away or trading for something. You choose the terms!
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-primary-600">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    3
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Browse & Connect</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Explore books being shared by people in your neighborhood. When you find something you like, message the owner directly through our secure messaging system. Start a conversation and arrange a time and place to meet.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-primary-600">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    4
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Meet & Exchange</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Meet your neighbor at an agreed location - a coffee shop, park, or another public place. Exchange books and get to know each other! Many of our users have made genuine friendships through BookSharePDX.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white rounded-lg p-8 border-l-4 border-primary-600">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    5
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Build Community</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Complete your exchange and enjoy your new book! Leave feedback about your experience if you'd like, and continue sharing and connecting with your neighbors. Every exchange builds a stronger, more connected community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team/Credits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Built by the Community</h2>

          <div className="bg-gradient-to-br from-primary-50 to-warm-50 rounded-lg p-12">
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              BookSharePDX was created with a simple vision: to make it easy for neighbors to share books and build community. While we may be a small team, we're inspired by and built for the vibrant Portland community.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              This platform stands on the shoulders of open-source communities, the accessibility of modern web technology, and most importantly, the generosity and goodwill of book lovers everywhere.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Have ideas for how we can improve? Love what we're building? We'd love to hear from you at{' '}
              <a href="mailto:hello@booksharepdx.com" className="text-primary-600 font-semibold hover:text-primary-700">
                hello@booksharepdx.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900 text-left">
                    {faq.question}
                  </h3>
                  <span
                    className={`flex-shrink-0 text-2xl transition-transform ${
                      expandedFaq === faq.id ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {expandedFaq === faq.id && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          <p className="text-xl text-gray-600 mb-8">
            Have questions or feedback? We'd love to hear from you.
          </p>

          <div className="bg-gradient-to-br from-primary-50 to-warm-50 rounded-lg p-12 mb-8">
            <p className="text-lg text-gray-700 mb-6">
              Email us at:
            </p>
            <a
              href="mailto:hello@booksharepdx.com"
              className="inline-block text-3xl font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
              hello@booksharepdx.com
            </a>
          </div>

          <p className="text-gray-600 mb-6">
            Or use the links in the footer to follow us on social media and stay updated on community events.
          </p>
        </div>
      </section>

      {/* CTA Section */}
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
    </div>
  );
}

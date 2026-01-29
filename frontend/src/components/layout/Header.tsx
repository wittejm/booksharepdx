import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { useInterest } from "../../contexts/InterestContext";
import { authService } from "../../services";
import logo from "../../assets/logo.png";

export default function Header() {
  const { currentUser, updateCurrentUser } = useUser();
  const { summary: interestSummary } = useInterest();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    updateCurrentUser(null);
    setIsProfileDropdownOpen(false);
    setIsMenuOpen(false);
    navigate("/");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsProfileDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex-shrink-0 flex items-center gap-3 hover:opacity-90 transition-opacity"
            onClick={closeMenu}
          >
            <img src={logo} alt="BookSharePDX Logo" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-[#164E4A]">
              BookSharePDX
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Browse */}
            <Link
              to="/browse"
              className="text-gray-700 hover:text-[#164E4A] font-medium transition-colors"
            >
              Browse
            </Link>

            {currentUser ? (
              <>
                {/* Logged-in Navigation */}
                <Link
                  to="/share"
                  className="text-gray-700 hover:text-[#164E4A] font-medium transition-colors relative"
                >
                  Share
                  {interestSummary.totalCount > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center justify-center px-1">
                      {interestSummary.totalCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/activity"
                  className="text-gray-700 hover:text-[#164E4A] font-medium transition-colors"
                >
                  My Activity
                </Link>
              </>
            ) : (
              <>
                {/* Anonymous Navigation */}
                <Link
                  to="/about"
                  className="text-gray-700 hover:text-[#164E4A] font-medium transition-colors"
                >
                  About
                </Link>
              </>
            )}

            {/* Auth Section */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#164E4A] text-white flex items-center justify-center text-sm font-semibold">
                    {currentUser.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="text-gray-700 font-medium hidden sm:inline">
                    {currentUser.username}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${
                      isProfileDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <Link
                      to="/my-profile"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-t-lg font-medium"
                      onClick={closeMenu}
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-b-lg font-medium border-t border-gray-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-lg font-medium text-white bg-[#164E4A] hover:bg-[#0F3A37] transition-colors"
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg font-medium text-[#164E4A] border border-[#164E4A] hover:bg-[#164E4A]/5 transition-colors"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? (
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-gray-200 pt-4">
            <Link
              to="/browse"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
              onClick={closeMenu}
            >
              Browse
            </Link>

            {currentUser ? (
              <>
                <Link
                  to="/share"
                  className="flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                  onClick={closeMenu}
                >
                  <span>Share</span>
                  {interestSummary.totalCount > 0 && (
                    <span className="min-w-[20px] h-[20px] bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center justify-center px-1">
                      {interestSummary.totalCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/activity"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                  onClick={closeMenu}
                >
                  My Activity
                </Link>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <Link
                    to="/my-profile"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                    onClick={closeMenu}
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/about"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                  onClick={closeMenu}
                >
                  About
                </Link>
                <div className="border-t border-gray-200 pt-2 mt-2 flex gap-2">
                  <Link
                    to="/signup"
                    className="flex-1 text-center px-4 py-2 rounded-lg font-medium text-white bg-[#164E4A] hover:bg-[#0F3A37] transition-colors"
                    onClick={closeMenu}
                  >
                    Sign Up
                  </Link>
                  <Link
                    to="/login"
                    className="flex-1 text-center px-4 py-2 rounded-lg font-medium text-[#164E4A] border border-[#164E4A] hover:bg-[#164E4A]/5 transition-colors"
                    onClick={closeMenu}
                  >
                    Login
                  </Link>
                </div>
              </>
            )}

          </div>
        )}
      </nav>
    </header>
  );
}

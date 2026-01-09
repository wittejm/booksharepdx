import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { User } from '@booksharepdx/shared';
import { authService } from './services';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/ScrollToTop';

// Page components
import LandingPage from './pages/LandingPage';
import BrowsePage from './pages/BrowsePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import LocationSelectionPage from './pages/LocationSelectionPage';
import ShareDetailPage from './pages/ShareDetailPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import ModerationPage from './pages/ModerationPage';

// Context for current user
import { UserContext, useUser } from './contexts/UserContext';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Moderator/Admin only route
function ModeratorRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();

  if (!currentUser || (currentUser.role !== 'moderator' && currentUser.role !== 'admin')) {
    return <Navigate to="/browse" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from cookies on mount
  useEffect(() => {
    const restoreSession = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      setLoading(false);
    };
    restoreSession();
  }, []);

  const updateCurrentUser = (user: User | null) => {
    setCurrentUser(user);
  };

  // Show loading while restoring session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ currentUser, updateCurrentUser }}>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              currentUser ? <Navigate to="/browse" replace /> : <LandingPage />
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/location-selection" element={
              <ProtectedRoute><LocationSelectionPage /></ProtectedRoute>
            } />
            <Route path="/about" element={<AboutPage />} />

            {/* Browse page - accessible to all */}
            <Route path="/browse" element={<BrowsePage />} />

            {/* Share detail - accessible to all */}
            <Route path="/share/:shareId" element={<ShareDetailPage />} />
            {/* Redirect old /post URLs to /share */}
            <Route path="/post/:postId" element={<Navigate to={window.location.pathname.replace('/post/', '/share/')} replace />} />

            {/* Protected routes */}
            <Route path="/messages" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/messages/:threadId" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />

            {/* Moderator-only routes */}
            <Route path="/moderation" element={
              <ModeratorRoute><ModerationPage /></ModeratorRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </UserContext.Provider>
  );
}

export default function App() {
  // Mobile debug console - remove when done debugging
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
    script.onload = () => (window as any).eruda.init();
    document.body.appendChild(script);
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

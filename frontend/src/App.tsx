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
import PostCreatePage from './pages/PostCreatePage';
import PostDetailPage from './pages/PostDetailPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import ModerationPage from './pages/ModerationPage';

// Context for current user
import { UserContext } from './contexts/UserContext';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Moderator/Admin only route
function ModeratorRoute({ children }: { children: React.ReactNode }) {
  const currentUser = authService.getCurrentUser();

  if (!currentUser || (currentUser.role !== 'moderator' && currentUser.role !== 'admin')) {
    return <Navigate to="/browse" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  const updateCurrentUser = (user: User | null) => {
    setCurrentUser(user);
  };

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

            {/* Post detail - accessible to all */}
            <Route path="/post/:postId" element={<PostDetailPage />} />

            {/* Protected routes */}
            <Route path="/post/create" element={
              <ProtectedRoute><PostCreatePage /></ProtectedRoute>
            } />
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
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

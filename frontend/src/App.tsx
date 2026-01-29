import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import type { User } from "@booksharepdx/shared";
import { authService } from "./services";

// Layout components
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/ScrollToTop";
import VerificationBanner from "./components/VerificationBanner";
import InterestBanner from "./components/InterestBanner";
import ToastContainer from "./components/ToastContainer";
import { useToast } from "./components/useToast";
import { setGlobalToastListener } from "./utils/globalToast";

// Page components
import LandingPage from "./pages/LandingPage";
import BrowsePage from "./pages/BrowsePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ActivityPage from "./pages/ActivityPage";
import SharePage from "./pages/SharePage";
import ProfilePage from "./pages/ProfilePage";
import GettingStartedPage from "./pages/GettingStartedPage";
// Note: SettingsPage removed - settings are now in MyProfilePage

// Lazy-loaded pages (code splitting)
const MyProfilePage = lazy(() => import("./pages/MyProfilePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
import VerifyMagicLinkPage from "./pages/VerifyMagicLinkPage";

// Context for current user
import { UserContext, useUser } from "./contexts/UserContext";
import { InterestProvider } from "./contexts/InterestContext";

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, dismiss } = useToast();

  // Connect global toast listener for apiClient errors
  useEffect(() => {
    setGlobalToastListener(showToast);
    return () => setGlobalToastListener(null);
  }, [showToast]);

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
      <InterestProvider>
        <ScrollToTop />
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
        <div className="flex flex-col min-h-screen">
          <Header />
          <VerificationBanner />
          <InterestBanner />
          <main className="flex-grow">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Loading...</div>
                </div>
              }
            >
              <Routes>
                {/* Public routes */}
                <Route
                  path="/"
                  element={
                    currentUser ? <GettingStartedPage /> : <LandingPage />
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route
                  path="/verify-magic-link"
                  element={<VerifyMagicLinkPage />}
                />
                <Route path="/about" element={<AboutPage />} />

                {/* Browse page - accessible to all */}
                <Route path="/browse" element={<BrowsePage />} />

                {/* Protected routes */}
                <Route
                  path="/activity"
                  element={
                    <ProtectedRoute>
                      <ActivityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/activity/:threadId"
                  element={
                    <ProtectedRoute>
                      <ActivityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/share"
                  element={
                    <ProtectedRoute>
                      <SharePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/share/:threadId"
                  element={
                    <ProtectedRoute>
                      <SharePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-profile"
                  element={
                    <ProtectedRoute>
                      <MyProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile/:username" element={<ProfilePage />} />
                {/* Redirect old settings route to my-profile */}
                <Route
                  path="/settings"
                  element={<Navigate to="/my-profile" replace />}
                />

                {/* 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </InterestProvider>
    </UserContext.Provider>
  );
}

export default function App() {
  // Mobile debug console - dev only, mobile only
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (import.meta.env.DEV && isMobile) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/eruda";
      script.onload = () => (window as any).eruda.init();
      document.body.appendChild(script);
    }
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

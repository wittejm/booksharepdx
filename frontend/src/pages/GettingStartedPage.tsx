import { useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { authService, postService } from "../services";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../components/useToast";
import ToastContainer from "../components/ToastContainer";
import LocationPicker from "../components/LocationPicker";
import { Check } from "lucide-react";

export default function GettingStartedPage() {
  const { currentUser, updateCurrentUser } = useUser();
  const [saving, setSaving] = useState(false);
  const [skippedLocation, setSkippedLocation] = useState(false);
  const { showToast, toasts, dismiss } = useToast();

  const fetchPosts = useCallback(async () => {
    if (!currentUser) return [];
    return postService.getByUserId(currentUser.id);
  }, [currentUser]);

  const { data: posts, loading } = useAsync(fetchPosts, [currentUser], []);

  const hasLocation = !!(
    currentUser?.location?.neighborhoodId ||
    (currentUser?.location?.lat && currentUser?.location?.lng)
  );

  const locationStepComplete = hasLocation || skippedLocation;

  const handleSaveLocation = async (location: {
    type: "neighborhood" | "pin";
    neighborhoodId: string;
    lat?: number;
    lng?: number;
  }) => {
    if (!currentUser) return;

    setSaving(true);

    try {
      const updatedUser = await authService.updateCurrentUser({ location });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
      }
      showToast("Location saved!", "success");
    } catch (error) {
      console.error("Error updating location:", error);
      showToast("Failed to save location. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking posts
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Redirect to browse if user has already shared
  if (posts && posts.length > 0) {
    return <Navigate to="/browse" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to BookShare PDX!
          </h1>
          <p className="text-gray-600">
            Let's get you set up to share books with your neighbors.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Set your location */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  locationStepComplete
                    ? "bg-green-100 text-green-600"
                    : "bg-primary-100 text-primary-600"
                }`}
              >
                {locationStepComplete ? <Check className="w-5 h-5" /> : "1"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Set your location
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  This helps neighbors know you're nearby.
                </p>

                {hasLocation ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 text-sm">
                      Location set! You can update it anytime in your profile
                      settings.
                    </p>
                  </div>
                ) : skippedLocation ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">
                      Skipped setting location. You can update it anytime in
                      your profile settings.
                    </p>
                  </div>
                ) : (
                  <LocationPicker
                    onSave={handleSaveLocation}
                    onCancel={() => setSkippedLocation(true)}
                    loading={saving}
                    showToast={showToast}
                    cancelLabel="Skip for now"
                    saveLabel="Save Location"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Share a book */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Share a book
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Post a book you'd like to give away, trade, or loan to a
                  neighbor.
                </p>
                <Link
                  to="/share?action=share"
                  className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                >
                  Share your first book →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Browse link */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Just want to browse?{" "}
            <Link
              to="/browse"
              className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
            >
              See books near you
            </Link>
          </p>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

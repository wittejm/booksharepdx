import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { authService } from "../services";
import { useToast } from "../components/useToast";
import ToastContainer from "../components/ToastContainer";
import LocationPicker from "../components/LocationPicker";
import { EMAIL_VERIFICATION_ENABLED } from "../config/features";

export default function LocationSelectionPage() {
  const { currentUser, updateCurrentUser } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { showToast, toasts, dismiss } = useToast();

  const handleSaveLocation = async (location: {
    type: "neighborhood" | "pin";
    neighborhoodId: string;
    lat?: number;
    lng?: number;
  }) => {
    if (!currentUser) return;

    setLoading(true);

    try {
      const updatedUser = await authService.updateCurrentUser({ location });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
      }

      navigate("/browse");
    } catch (error) {
      console.error("Error updating location:", error);
      showToast("Failed to save location. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-2xl">
        <div className="card p-8">
          <div className="text-center mb-8">
            {EMAIL_VERIFICATION_ENABLED ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Email Verified!
                </h1>
                <p className="text-gray-600">
                  Now, let's set up your location so neighbors can find your
                  books
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                  <svg
                    className="w-8 h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Set Your Location
                </h1>
                <p className="text-gray-600">
                  Let neighbors know where to find your books
                </p>
              </>
            )}
          </div>

          <LocationPicker
            onSave={handleSaveLocation}
            onCancel={() => navigate("/browse")}
            loading={loading}
            showToast={showToast}
            cancelLabel="Skip for Now"
            saveLabel="Continue"
          />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

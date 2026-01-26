import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import type { User, EmailNotificationPreferences } from "@booksharepdx/shared";
import {
  authService,
  blockService,
  userService,
  neighborhoodService,
} from "../services";
import { useUser } from "../contexts/UserContext";
import { useToast } from "../components/useToast";
import ToastContainer from "../components/ToastContainer";
import LocationPicker from "../components/LocationPicker";
import MapPicker from "../components/MapPicker";
import EditableText from "../components/EditableText";
import ProfilePictureUploadModal from "../components/ProfilePictureUploadModal";
import NotificationToggle from "../components/NotificationToggle";

type TabType = "loves" | "lookingFor";

export default function MyProfilePage() {
  const { currentUser, updateCurrentUser } = useUser();

  const { showToast, toasts, dismiss } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("loves");

  // State
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  // Section expand states
  const [showChangeLocation, setShowChangeLocation] = useState(false);
  const [showPreciseLocationPicker, setShowPreciseLocationPicker] =
    useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!currentUser) return;
    loadBlockedUsers();
  }, [currentUser]);

  const loadBlockedUsers = async () => {
    if (!currentUser) return;

    const blockedIds = await blockService.getBlocked(currentUser.id);
    const users = await Promise.all(
      blockedIds.map(async (id) => {
        const user = await userService.getById(id);
        return user;
      }),
    );
    setBlockedUsers(users.filter((u): u is User => u !== null));
  };

  const handleSavePreferredName = async (name: string) => {
    if (!currentUser) return;

    try {
      const updatedUser = await authService.updateCurrentUser({
        preferredName: name || null,
      });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
      }
    } catch {
      showToast("Failed to update name", "error");
      throw new Error("Failed to save");
    }
  };

  const handleSaveBio = async (bio: string) => {
    if (!currentUser) return;

    try {
      const updatedUser = await authService.updateCurrentUser({ bio });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
        showToast("Bio updated", "success");
      }
    } catch {
      showToast("Failed to update bio", "error");
      throw new Error("Failed to save");
    }
  };

  const handleSaveProfilePicture = async (imageBase64: string) => {
    if (!currentUser) return;

    try {
      const updatedUser = await authService.updateCurrentUser({
        profilePicture: imageBase64 || undefined,
      });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
        showToast(
          imageBase64 ? "Profile picture updated" : "Profile picture removed",
          "success",
        );
      }
    } catch {
      showToast("Failed to update profile picture", "error");
      throw new Error("Failed to save");
    }
  };

  const handleUnblock = async (userId: string) => {
    if (!currentUser) return;

    try {
      await blockService.unblock(currentUser.id, userId);
      setBlockedUsers(blockedUsers.filter((u) => u.id !== userId));
      showToast("User unblocked", "success");
    } catch (error) {
      showToast("Failed to unblock user", "error");
    }
  };

  const handleChangeLocation = async (location: {
    type: "neighborhood" | "pin";
    neighborhoodId: string;
    lat?: number;
    lng?: number;
  }) => {
    if (!currentUser) return;

    setLocationLoading(true);
    try {
      const updatedUser = await authService.updateCurrentUser({ location });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
        setShowChangeLocation(false);
      }
    } catch (error) {
      console.error("Failed to update location:", error);
      showToast("Failed to update location", "error");
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePreciseLocationSelect = async (position: {
    lat: number;
    lng: number;
  }) => {
    if (!currentUser || !currentUser.location.neighborhoodId) return;

    setLocationLoading(true);
    try {
      const updatedUser = await authService.updateCurrentUser({
        location: {
          type: "pin",
          neighborhoodId: currentUser.location.neighborhoodId,
          lat: position.lat,
          lng: position.lng,
        },
      });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
        setShowPreciseLocationPicker(false);
      }
    } catch (error) {
      console.error("Failed to update location:", error);
      showToast("Failed to update location", "error");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleRemovePin = async () => {
    if (!currentUser || !currentUser.location.neighborhoodId) return;

    setLocationLoading(true);
    try {
      const updatedUser = await authService.updateCurrentUser({
        location: {
          type: "neighborhood",
          neighborhoodId: currentUser.location.neighborhoodId,
        },
      });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error("Failed to remove pin:", error);
      showToast("Failed to update location", "error");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    await authService.logout();
    updateCurrentUser(null);
  };

  const handleNotificationToggle = async (
    key: keyof EmailNotificationPreferences,
    enabled: boolean,
  ) => {
    if (!currentUser) return;

    setNotificationLoading(key as string);
    try {
      const updatedPrefs: EmailNotificationPreferences = {
        ...currentUser.emailNotifications,
        [key]: enabled,
      };
      const updatedUser = await authService.updateCurrentUser({
        emailNotifications: updatedPrefs,
      });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
      }
    } catch {
      showToast("Failed to update notification settings", "error");
    } finally {
      setNotificationLoading(null);
    }
  };

  const handleToggleAllNotifications = async (enabled: boolean) => {
    if (!currentUser) return;

    setNotificationLoading("all");
    try {
      const updatedPrefs: EmailNotificationPreferences = {
        bookRequested: enabled,
        requestDecision: enabled,
        newMessage: enabled,
        tradeProposal: enabled,
      };
      const updatedUser = await authService.updateCurrentUser({
        emailNotifications: updatedPrefs,
      });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
      }
    } catch {
      showToast("Failed to update notification settings", "error");
    } finally {
      setNotificationLoading(null);
    }
  };

  const notificationStates = [
    currentUser?.emailNotifications?.bookRequested !== false,
    currentUser?.emailNotifications?.requestDecision !== false,
    currentUser?.emailNotifications?.newMessage !== false,
    currentUser?.emailNotifications?.tradeProposal !== false,
  ];
  const enabledCount = notificationStates.filter(Boolean).length;
  const allNotificationsEnabled = enabledCount === 4;
  const someNotificationsEnabled = enabledCount > 0 && enabledCount < 4;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const currentNeighborhood = currentUser.location.neighborhoodId
    ? neighborhoodService.getById(currentUser.location.neighborhoodId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Picture - Clickable to upload */}
            <button
              onClick={() => setShowProfilePictureModal(true)}
              className="flex-shrink-0 relative group cursor-pointer"
            >
              {currentUser.profilePicture ? (
                <img
                  src={currentUser.profilePicture}
                  alt={currentUser.username}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary-100 group-hover:border-primary-300 transition-colors"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary-100 flex items-center justify-center border-4 border-primary-200 group-hover:border-primary-300 transition-colors">
                  <span className="text-4xl md:text-5xl font-bold text-primary-600">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Edit indicator - always visible in bottom right */}
              <div className="absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center shadow-sm">
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            </button>

            {/* Profile Info */}
            <div className="flex-1 w-full md:w-auto">
              <div className="mb-2">
                {/* Editable Preferred Name */}
                <EditableText
                  value={currentUser.preferredName || ""}
                  onSave={handleSavePreferredName}
                  placeholder="Add your name"
                  emptyText={`@${currentUser.username}`}
                  className="text-2xl md:text-3xl font-bold text-gray-900"
                  inputClassName="text-2xl md:text-3xl font-bold"
                />
                <div className="text-gray-500 text-sm">
                  @{currentUser.username}
                </div>
                <div className="text-gray-600 flex flex-wrap items-center gap-3 mt-1">
                  <span>{currentNeighborhood?.name || "Portland"}</span>
                  <span>•</span>
                  <span>Member since {formatDate(currentUser.createdAt)}</span>
                </div>
              </div>

              {/* Editable Bio */}
              <div className="mb-4">
                <EditableText
                  value={currentUser.bio || ""}
                  onSave={handleSaveBio}
                  placeholder="Add a bio..."
                  emptyText="Add a bio..."
                  multiline
                  maxLength={300}
                  className="text-gray-700"
                />
              </div>

              {/* Stats */}
              <div>
                <button
                  onClick={() => setStatsExpanded(!statsExpanded)}
                  className="flex items-center gap-2 text-left hover:text-primary-600 transition-colors"
                >
                  <span className="text-2xl font-bold text-primary-600">
                    {currentUser.stats.bookshares}
                  </span>
                  <span className="text-gray-700">Bookshares</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${statsExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {statsExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex flex-col gap-2 md:flex-row md:gap-6">
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">
                          Gave
                        </span>
                        <span className="font-semibold text-primary-600 md:text-lg">
                          {currentUser.stats.booksGiven}
                        </span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">
                          Received
                        </span>
                        <span className="font-semibold text-primary-600 md:text-lg">
                          {currentUser.stats.booksReceived}
                        </span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">
                          Loaned
                        </span>
                        <span className="font-semibold text-primary-600 md:text-lg">
                          {currentUser.stats.booksLoaned}
                        </span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">
                          Borrowed
                        </span>
                        <span className="font-semibold text-primary-600 md:text-lg">
                          {currentUser.stats.booksBorrowed}
                        </span>
                      </div>
                      <div className="flex justify-between md:block md:text-center">
                        <span className="text-gray-600 md:block md:text-sm">
                          Traded
                        </span>
                        <span className="font-semibold text-primary-600 md:text-lg">
                          {currentUser.stats.booksTraded}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>

          {!showChangeLocation ? (
            <div className="space-y-4">
              {/* Neighborhood */}
              <div>
                <div className="text-sm text-gray-500">Neighborhood</div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium">
                    {currentNeighborhood?.name || "Not set"}
                  </span>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={() => setShowChangeLocation(true)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                    disabled={locationLoading}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Precise Location */}
              {currentNeighborhood && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-3">
                    {currentUser.location.type === "pin" &&
                    currentUser.location.lat &&
                    currentUser.location.lng
                      ? "Precise Location"
                      : "No precise location"}
                  </div>

                  {currentUser.location.type === "pin" &&
                  currentUser.location.lat &&
                  currentUser.location.lng ? (
                    // User has a pin - show the map
                    <div className="space-y-3">
                      <MapPicker
                        center={{
                          lat: currentUser.location.lat,
                          lng: currentUser.location.lng,
                        }}
                        selectedPosition={{
                          lat: currentUser.location.lat,
                          lng: currentUser.location.lng,
                        }}
                        onPositionSelect={handlePreciseLocationSelect}
                      />
                      <button
                        onClick={handleRemovePin}
                        className="text-sm text-red-600 hover:text-red-700"
                        disabled={locationLoading}
                      >
                        {locationLoading ? "Removing..." : "Remove Pin"}
                      </button>
                    </div>
                  ) : showPreciseLocationPicker ? (
                    // User clicked to add a pin - show the map picker
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 italic">
                        Click on the map to drop a pin
                      </p>
                      <MapPicker
                        center={currentNeighborhood.centroid}
                        selectedPosition={null}
                        onPositionSelect={handlePreciseLocationSelect}
                      />
                      <button
                        onClick={() => setShowPreciseLocationPicker(false)}
                        className="text-sm text-gray-600 hover:text-gray-700"
                        disabled={locationLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    // No pin - show button to add one
                    <button
                      onClick={() => setShowPreciseLocationPicker(true)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                      disabled={locationLoading}
                    >
                      Select more precise location
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <LocationPicker
              initialNeighborhoodId={currentUser.location.neighborhoodId || ""}
              initialPreciseLocation={
                currentUser.location.type === "pin" &&
                currentUser.location.lat &&
                currentUser.location.lng
                  ? {
                      lat: currentUser.location.lat,
                      lng: currentUser.location.lng,
                    }
                  : null
              }
              onSave={handleChangeLocation}
              onCancel={() => setShowChangeLocation(false)}
              loading={locationLoading}
              showToast={showToast}
            />
          )}
        </div>

        {/* Tabs for Content */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab("loves")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "loves"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Loves
              </button>
              <button
                onClick={() => setActiveTab("lookingFor")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "lookingFor"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Looking For
              </button>
            </nav>
          </div>
        </div>

        {/* Loves Tab */}
        {activeTab === "loves" && (
          <div className="space-y-8">
            {currentUser.readingPreferences?.favoriteGenres &&
              currentUser.readingPreferences.favoriteGenres.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Genres
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.readingPreferences.favoriteGenres.map(
                      (genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                        >
                          {genre}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

            {currentUser.readingPreferences?.favoriteBooks &&
              currentUser.readingPreferences.favoriteBooks.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 px-6">
                    Books
                  </h3>
                  {currentUser.readingPreferences.favoriteBooks.map(
                    (book, index) => (
                      <div key={index} className="card p-4 flex gap-4">
                        <div className="flex-shrink-0">
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-24 h-36 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-24 h-36 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">
                                No Cover
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">
                            {book.title}
                          </h4>
                          <p className="text-gray-600 text-sm">{book.author}</p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

            {currentUser.readingPreferences?.favoriteAuthors &&
              currentUser.readingPreferences.favoriteAuthors.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Authors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.readingPreferences.favoriteAuthors.map(
                      (author) => (
                        <span
                          key={author}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                        >
                          {author}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

            {!currentUser.readingPreferences?.favoriteGenres?.length &&
              !currentUser.readingPreferences?.favoriteAuthors?.length &&
              !currentUser.readingPreferences?.favoriteBooks?.length && (
                <div className="card p-12 text-center">
                  <p className="text-gray-600">
                    No reading preferences added yet.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Looking For Tab */}
        {activeTab === "lookingFor" && (
          <div className="space-y-8">
            {currentUser.readingPreferences?.lookingForGenres &&
              currentUser.readingPreferences.lookingForGenres.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Genres
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.readingPreferences.lookingForGenres.map(
                      (genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {genre}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

            {currentUser.readingPreferences?.lookingForBooks &&
              currentUser.readingPreferences.lookingForBooks.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 px-6">
                    Books
                  </h3>
                  {currentUser.readingPreferences.lookingForBooks.map(
                    (book, index) => (
                      <div key={index} className="card p-4 flex gap-4">
                        <div className="flex-shrink-0">
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-24 h-36 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-24 h-36 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">
                                No Cover
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">
                            {book.title}
                          </h4>
                          <p className="text-gray-600 text-sm">{book.author}</p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

            {currentUser.readingPreferences?.lookingForAuthors &&
              currentUser.readingPreferences.lookingForAuthors.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Authors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.readingPreferences.lookingForAuthors.map(
                      (author) => (
                        <span
                          key={author}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                        >
                          {author}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

            {!currentUser.readingPreferences?.lookingForGenres?.length &&
              !currentUser.readingPreferences?.lookingForAuthors?.length &&
              !currentUser.readingPreferences?.lookingForBooks?.length && (
                <div className="card p-12 text-center">
                  <p className="text-gray-600">No preferences added yet.</p>
                </div>
              )}
          </div>
        )}

        {/* Privacy Section */}
        <div className="card p-6 mb-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy</h2>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Blocked Users
            </h3>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No blocked users.</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-600">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {user.username}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnblock(user.id)}
                      className="btn-secondary text-sm"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Notifications Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Email Notifications
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Choose which emails you'd like to receive.
          </p>

          <div className="divide-y divide-gray-100">
            <NotificationToggle
              label="All Notifications"
              description="Enable or disable all email notifications"
              enabled={allNotificationsEnabled}
              indeterminate={someNotificationsEnabled}
              onChange={handleToggleAllNotifications}
              loading={notificationLoading === "all"}
            />
            <div className="pt-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide py-2">
                Individual Settings
              </p>
            </div>
            <NotificationToggle
              label="Book Requests"
              description="When someone requests one of your books"
              enabled={currentUser.emailNotifications?.bookRequested !== false}
              onChange={(enabled) =>
                handleNotificationToggle("bookRequested", enabled)
              }
              loading={notificationLoading === "bookRequested"}
            />
            <NotificationToggle
              label="Request Decisions"
              description="When an owner accepts or declines your request"
              enabled={
                currentUser.emailNotifications?.requestDecision !== false
              }
              onChange={(enabled) =>
                handleNotificationToggle("requestDecision", enabled)
              }
              loading={notificationLoading === "requestDecision"}
            />
            <NotificationToggle
              label="New Messages"
              description="When you receive a new message (max 1 per 5 minutes per conversation)"
              enabled={currentUser.emailNotifications?.newMessage !== false}
              onChange={(enabled) =>
                handleNotificationToggle("newMessage", enabled)
              }
              loading={notificationLoading === "newMessage"}
            />
            <NotificationToggle
              label="Trade Proposals"
              description="When someone sends you a trade proposal"
              enabled={currentUser.emailNotifications?.tradeProposal !== false}
              onChange={(enabled) =>
                handleNotificationToggle("tradeProposal", enabled)
              }
              loading={notificationLoading === "tradeProposal"}
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 mb-6 border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>

          <div>
            <p className="text-sm text-gray-600 mb-4">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="btn-danger"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">
              Delete Account
            </h3>
            <p className="text-gray-700 mb-4">
              Are you absolutely sure you want to delete your account? This
              action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              All your posts, messages, and data will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAccount(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn-danger flex-1"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Upload Modal */}
      {showProfilePictureModal && (
        <ProfilePictureUploadModal
          currentImage={currentUser.profilePicture}
          onSave={handleSaveProfilePicture}
          onClose={() => setShowProfilePictureModal(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

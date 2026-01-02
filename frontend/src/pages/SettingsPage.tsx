import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, SocialLink } from '@booksharepdx/shared';
import { authService, blockService, userService, neighborhoodService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/useToast';
import ToastContainer from '../components/ToastContainer';

const GENRE_OPTIONS = [
  'Literary Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Romance',
  'Historical Fiction',
  'Non-Fiction',
  'Biography',
  'Memoir',
  'Self-Help',
  'Poetry',
  'Horror',
  'Young Adult',
  'Graphic Novels',
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useUser();

  const [loading, setLoading] = useState(false);
  const { showToast, toasts, dismiss } = useToast();

  // Form states
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  // Modal states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeLocation, setShowChangeLocation] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Location change
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Load current user data
    setUsername(currentUser.username);
    setBio(currentUser.bio || '');
    setProfilePicture(currentUser.profilePicture || '');
    setSelectedGenres(currentUser.readingPreferences?.favoriteGenres || []);
    setSocialLinks(currentUser.socialLinks || []);

    if (currentUser.location.type === 'neighborhood') {
      setSelectedNeighborhood(currentUser.location.neighborhoodId || '');
    }

    // Load blocked users
    loadBlockedUsers();
  }, [currentUser, navigate]);

  const loadBlockedUsers = async () => {
    if (!currentUser) return;

    const blockedIds = await blockService.getBlocked(currentUser.id);
    const users = await Promise.all(
      blockedIds.map(async (id) => {
        const user = await userService.getById(id);
        return user;
      })
    );
    setBlockedUsers(users.filter((u): u is User => u !== null));
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    if (!username.trim()) {
      showToast('Username is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        username: username.trim(),
        bio: bio.trim(),
        profilePicture: profilePicture || undefined,
        readingPreferences: {
          favoriteGenres: selectedGenres,
          favoriteAuthors: currentUser.readingPreferences?.favoriteAuthors || [],
        },
        socialLinks: socialLinks.filter((link) => link.label && link.url),
      };

      const updatedUser = authService.updateCurrentUser(updates);
      if (updatedUser) {
        updateCurrentUser(updatedUser);
        showToast('Profile updated successfully!', 'success');
      }
    } catch (error) {
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePicture(base64String);
    };
    reader.readAsDataURL(file);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { label: '', url: '' }]);
  };

  const updateSocialLink = (index: number, field: 'label' | 'url', value: string) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleUnblock = async (userId: string) => {
    if (!currentUser) return;

    try {
      await blockService.unblock(currentUser.id, userId);
      setBlockedUsers(blockedUsers.filter((u) => u.id !== userId));
      showToast('User unblocked', 'success');
    } catch (error) {
      showToast('Failed to unblock user', 'error');
    }
  };

  const handleChangeLocation = async () => {
    if (!currentUser || !selectedNeighborhood) return;

    setLoading(true);
    try {
      const updatedUser = authService.updateCurrentUser({
        location: { type: 'neighborhood', neighborhoodId: selectedNeighborhood },
      });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
        showToast('Location updated successfully!', 'success');
        setShowChangeLocation(false);
      }
    } catch (error) {
      showToast('Failed to update location', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    // In a real app, this would call an API to delete the account
    // For now, we'll just log out
    authService.logout();
    updateCurrentUser(null);
    navigate('/');
  };

  if (!currentUser) {
    return null;
  }

  const neighborhoods = neighborhoodService.getAll();
  const currentNeighborhood =
    currentUser.location.type === 'neighborhood' && currentUser.location.neighborhoodId
      ? neighborhoodService.getById(currentUser.location.neighborhoodId)
      : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Account Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="text-gray-900">{currentUser.email}</div>
              <p className="text-sm text-gray-500 mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="btn-secondary"
                disabled={loading}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Location
              </label>
              <div className="text-gray-900">{currentNeighborhood?.name || 'Portland'}</div>
            </div>

            <div>
              <button
                onClick={() => setShowChangeLocation(true)}
                className="btn-secondary"
                disabled={loading}
              >
                Change Location
              </button>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Profile</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="input resize-none"
                disabled={loading}
                maxLength={300}
              />
              <p className="text-sm text-gray-500 mt-1">{bio.length}/300 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </label>
              {profilePicture && (
                <div className="mb-3">
                  <img
                    src={profilePicture}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-sm text-gray-600"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">Max size: 5MB</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reading Preferences (Genres)
              </label>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedGenres.includes(genre)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={loading}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Social Links</label>
                <button
                  onClick={addSocialLink}
                  className="text-sm text-primary-600 hover:text-primary-700"
                  disabled={loading}
                >
                  + Add Link
                </button>
              </div>
              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                      placeholder="Label (e.g., Twitter)"
                      className="input flex-1"
                      disabled={loading}
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                      placeholder="URL"
                      className="input flex-1"
                      disabled={loading}
                    />
                    <button
                      onClick={() => removeSocialLink(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {socialLinks.length === 0 && (
                  <p className="text-sm text-gray-500">No social links added yet.</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveProfile}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy</h2>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Blocked Users</h3>
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
                      <span className="font-medium text-gray-900">{user.username}</span>
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

        {/* Danger Zone */}
        <div className="card p-6 mb-6 border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>

          <div>
            <p className="text-sm text-gray-600 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="btn-danger"
              disabled={loading}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Change Password</h3>
            <p className="text-gray-600 mb-4">
              Password changes are not implemented in this demo version.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowChangePassword(false)} className="btn-secondary flex-1">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Location Modal */}
      {showChangeLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Change Location</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Neighborhood
              </label>
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="input"
              >
                <option value="">Select a neighborhood</option>
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowChangeLocation(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleChangeLocation}
                className="btn-primary flex-1"
                disabled={!selectedNeighborhood || loading}
              >
                {loading ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">Delete Account</h3>
            <p className="text-gray-700 mb-4">
              Are you absolutely sure you want to delete your account? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              All your posts, messages, and data will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowDeleteAccount(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} className="btn-danger flex-1">
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

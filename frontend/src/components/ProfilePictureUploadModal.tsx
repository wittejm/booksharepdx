import { useState, useRef } from "react";

interface ProfilePictureUploadModalProps {
  currentImage?: string;
  onSave: (imageBase64: string) => Promise<void>;
  onClose: () => void;
}

export default function ProfilePictureUploadModal({
  currentImage,
  onSave,
  onClose,
}: ProfilePictureUploadModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!preview) return;

    setSaving(true);
    try {
      await onSave(preview);
      onClose();
    } catch {
      setError("Failed to save image");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await onSave("");
      onClose();
    } catch {
      setError("Failed to remove image");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Profile Picture</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {preview || currentImage ? (
              <img
                src={preview || currentImage}
                alt="Profile preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary-100"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full btn-secondary"
            disabled={saving}
          >
            {preview ? "Choose Different Image" : "Choose Image"}
          </button>

          {preview && (
            <button
              onClick={handleSave}
              className="w-full btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}

          {currentImage && !preview && (
            <button
              onClick={handleRemove}
              className="w-full text-red-600 hover:text-red-700 text-sm py-2"
              disabled={saving}
            >
              {saving ? "Removing..." : "Remove Current Picture"}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Max size: 5MB. Supported formats: JPG, PNG, GIF
        </p>
      </div>
    </div>
  );
}

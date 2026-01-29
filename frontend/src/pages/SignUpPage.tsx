import { useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "@booksharepdx/shared";
import { authService } from "../services";
import { useUser } from "../contexts/UserContext";
import { isValidEmail } from "../utils/validation";
import { broadcastLogin } from "../utils/pendingAuth";
import { useAuthRedirect } from "../hooks/useAuthRedirect";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    preferredName: "",
    bio: "",
  });

  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);

  const { updateCurrentUser } = useUser();
  const { handlePostLoginRedirect } = useAuthRedirect("/");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.bio.trim()) {
      newErrors.bio = "Bio is required";
    }

    if (!agreedToGuidelines) {
      newErrors.guidelines = "You must agree to the Community Guidelines";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name] || errors.form) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        delete newErrors.form;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await authService.signup(formData);

      // Check if email verification is required
      if ("requiresVerification" in result) {
        setEmailSent(true);
        return;
      }

      // Direct login (dev mode) - result is a User
      updateCurrentUser(result as User);
      broadcastLogin();
      handlePostLoginRedirect();
    } catch (error) {
      const err = error as Error & { code?: string };
      const code = err.code;
      const message = err.message;

      if (code === "EMAIL_TAKEN") {
        setErrors({
          email: "This email is already registered. Please login instead.",
        });
      } else if (code === "USERNAME_TAKEN") {
        setErrors({
          username: "This username is already taken. Please choose another.",
        });
      } else {
        setErrors({
          form: message || "Something went wrong. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show success message when email verification is required
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Check Your Email
            </h1>
            <p className="text-gray-600 mb-6">
              We sent a sign-in link to{" "}
              <span className="font-medium text-gray-900">
                {formData.email}
              </span>
              . Click the link in the email to complete your registration.
            </p>
            <p className="text-sm text-gray-500">
              The link expires in 30 minutes. If you don't see it, check your
              spam folder.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
            Join BookSharePDX
          </h1>

          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className={`input ${errors.email ? "border-red-500 focus:ring-red-500" : ""}`}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Choose a username"
                className={`input ${errors.username ? "border-red-500 focus:ring-red-500" : ""}`}
                disabled={loading}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="preferredName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Preferred Name{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="preferredName"
                name="preferredName"
                value={formData.preferredName}
                onChange={handleInputChange}
                placeholder="What should people call you?"
                className="input"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows={4}
                className={`input resize-none ${errors.bio ? "border-red-500 focus:ring-red-500" : ""}`}
                disabled={loading}
              />
              {errors.bio && (
                <p className="text-red-500 text-sm mt-1">{errors.bio}</p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="guidelines"
                checked={agreedToGuidelines}
                onChange={(e) => {
                  setAgreedToGuidelines(e.target.checked);
                  if (errors.guidelines) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.guidelines;
                      return newErrors;
                    });
                  }
                }}
                disabled={loading}
                className="mt-1 w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor="guidelines"
                className="text-sm text-gray-700 cursor-pointer"
              >
                I agree to the{" "}
                <a
                  href="/about#community-guidelines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  Community Guidelines
                </a>{" "}
                and understand that BookSharePDX is a community built on trust
                and respect.
              </label>
            </div>
            {errors.guidelines && (
              <p className="text-red-500 text-sm">{errors.guidelines}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Already have an account?
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="mt-6 block w-full text-center py-2 px-4 rounded-lg border-2 border-primary-600 text-primary-600 font-medium hover:bg-primary-50 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

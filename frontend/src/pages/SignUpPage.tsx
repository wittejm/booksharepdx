import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/useToast';
import ToastContainer from '../components/ToastContainer';
import { isValidEmail } from '../utils/validation';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    preferredName: '',
    bio: '',
  });

  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast, toasts, dismiss } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { updateCurrentUser } = useUser();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.bio.trim()) {
      newErrors.bio = 'Bio is required';
    }

    if (!agreedToGuidelines) {
      newErrors.guidelines = 'You must agree to the Community Guidelines';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
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
      const user = await authService.signup(formData);
      updateCurrentUser(user);
      showToast('Account created successfully!', 'success', 2000);

      setTimeout(() => {
        navigate('/location-selection');
      }, 1500);
    } catch (error) {
      const err = error as Error & { code?: string };
      const code = err.code;
      const message = err.message;

      if (code === 'EMAIL_TAKEN') {
        setErrors({ email: 'This email is already registered. Please login instead.' });
        showToast('Email already in use', 'error');
      } else if (code === 'USERNAME_TAKEN') {
        setErrors({ username: 'This username is already taken. Please choose another.' });
        showToast('Username already taken', 'error');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Join BookSharePDX</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Choose a username"
                className={`input ${errors.username ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="preferredName" className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Name <span className="text-gray-400 font-normal">(optional)</span>
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
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows={4}
                className={`input resize-none ${errors.bio ? 'border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              />
              {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio}</p>}
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
              <label htmlFor="guidelines" className="text-sm text-gray-700 cursor-pointer">
                I agree to the{' '}
                <Link to="/about#community-guidelines" className="text-primary-600 hover:text-primary-700 underline">
                  Community Guidelines
                </Link>{' '}
                and understand that BookSharePDX is a community built on trust and respect.
              </label>
            </div>
            {errors.guidelines && <p className="text-red-500 text-sm">{errors.guidelines}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

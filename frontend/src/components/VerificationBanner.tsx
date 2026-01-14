import { useUser } from '../contexts/UserContext';

export default function VerificationBanner() {
  const { currentUser } = useUser();

  // Only show for logged-in, unverified users
  if (!currentUser || currentUser.verified) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <p className="text-sm text-amber-800 text-center">
          Check your email and click the magic link to verify your account.
        </p>
      </div>
    </div>
  );
}

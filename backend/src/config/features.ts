// Feature flags for enabling/disabling functionality

// Email verification flow - when false, users are auto-verified and login is instant
// Set via EMAIL_VERIFICATION_ENABLED env var (defaults to false for dev/staging)
export const EMAIL_VERIFICATION_ENABLED =
  process.env.EMAIL_VERIFICATION_ENABLED === "true";

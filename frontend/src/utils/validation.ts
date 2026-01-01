/**
 * Validates an email address format.
 * @param email - Email string to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string' || email.trim() === '') {
    return false;
  }

  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a password.
 * Requirements: minimum 8 characters
 * @param password - Password string to validate
 * @returns true if password meets requirements, false otherwise
 */
export function isValidPassword(password: string): boolean {
  if (typeof password !== 'string') {
    return false;
  }

  return password.length >= 8;
}

/**
 * Validates a username.
 * Requirements: alphanumeric characters and underscores only
 * @param username - Username string to validate
 * @returns true if username is valid, false otherwise
 */
export function isValidUsername(username: string): boolean {
  if (typeof username !== 'string' || username.trim() === '') {
    return false;
  }

  // Allow alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username);
}

/**
 * Validates a bio/profile description.
 * Requirements: minimum ~20 characters (approximately one sentence)
 * @param bio - Bio string to validate
 * @returns true if bio meets minimum length requirement, false otherwise
 */
export function isValidBio(bio: string): boolean {
  if (typeof bio !== 'string') {
    return false;
  }

  // Minimum 20 characters for approximately one sentence
  return bio.trim().length >= 20;
}

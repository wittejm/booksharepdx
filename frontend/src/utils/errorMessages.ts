/**
 * Centralized error messages for consistent user-facing errors
 */

export const ERROR_MESSAGES = {
  // Network/Connection errors
  NETWORK_ERROR: 'Unable to connect to the server. This is likely a server configuration error.',

  // Auth errors
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'Please log in to continue.',
  ACCOUNT_BANNED: 'Your account has been suspended. Please contact support.',
  ACCOUNT_NOT_FOUND: 'No account found with that email or username.',

  // Generic errors
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  GENERIC_LOAD_ERROR: 'Unable to load. Please try again.',
  GENERIC_SAVE_ERROR: 'Unable to save. Please try again.',
  GENERIC_DELETE_ERROR: 'Unable to delete. Please try again.',

  // Resource not found
  POST_NOT_FOUND: 'This listing could not be found. It may have been removed.',
  THREAD_NOT_FOUND: 'This conversation no longer exists.',

  // Server errors by status code
  SERVER_ERROR: 'An unexpected server error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
} as const;

/**
 * Get a user-friendly error message from an error code
 */
export function getErrorMessage(code?: string): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES];
  }
  return ERROR_MESSAGES.GENERIC_ERROR;
}

/**
 * Get error message from HTTP status code
 */
export function getErrorMessageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid. Please check your input and try again.';
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource could not be found.';
    case 409:
      return 'This action conflicts with the current state. Please refresh and try again.';
    case 422:
      return 'The provided data could not be processed. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return ERROR_MESSAGES.SERVER_ERROR;
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    default:
      return ERROR_MESSAGES.GENERIC_ERROR;
  }
}

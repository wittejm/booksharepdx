/**
 * API Client for making authenticated requests to the backend
 * Uses cookie-based JWT authentication
 */

import { ERROR_MESSAGES, getErrorMessage, getErrorMessageFromStatus } from '../utils/errorMessages';
import { showGlobalToast } from '../utils/globalToast';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Custom API error class with additional context
 */
export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Returns a user-friendly error message based on the error type
   */
  getUserMessage(): string {
    // Return the backend message if available, otherwise provide a fallback
    if (this.message && this.message !== 'Request failed') {
      return this.message;
    }
    // Try error code first, then status code
    const codeMessage = getErrorMessage(this.code);
    if (codeMessage !== ERROR_MESSAGES.GENERIC_ERROR) {
      return codeMessage;
    }
    return getErrorMessageFromStatus(this.statusCode);
  }

  /**
   * Check if this is an authentication error that requires re-login
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.code === 'SESSION_EXPIRED' || this.code === 'UNAUTHORIZED';
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const url = `${this.baseURL}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Always send cookies for JWT auth
      });
    } catch (networkError) {
      // Handle network errors (CORS issues, server unreachable, etc.)
      const error = new ApiError(
        ERROR_MESSAGES.NETWORK_ERROR,
        'NETWORK_ERROR',
        0
      );
      showGlobalToast(error.getUserMessage(), 'error');
      throw error;
    }

    if (!response.ok) {
      let errorBody: { error?: { message?: string; code?: string; details?: unknown } };
      try {
        errorBody = await response.json();
      } catch {
        errorBody = {
          error: {
            message: response.statusText || 'An error occurred',
            code: 'UNKNOWN',
          },
        };
      }

      // Backend returns { error: { message, code, details? } }
      const errorData = errorBody.error || errorBody;
      const error = new ApiError(
        (errorData as any).message || 'Request failed',
        (errorData as any).code || 'UNKNOWN',
        response.status,
        (errorData as any).details
      );

      // Auto-redirect to login on session expiration (except for auth endpoints)
      if (error.isAuthError() && !endpoint.startsWith('/auth/')) {
        const isAuthPage = window.location.pathname.startsWith('/login') ||
                          window.location.pathname.startsWith('/signup') ||
                          window.location.pathname.startsWith('/verify-magic-link');
        // Don't redirect if already on auth pages (prevents reload loop)
        if (!isAuthPage) {
          window.location.href = '/login?expired=true';
          // Return a never-resolving promise to prevent further processing
          return new Promise(() => {});
        }
        // On auth pages, log for debugging and throw error
        console.warn('[apiClient] Auth error on auth page:', endpoint, error.code);
        throw error;
      }

      // Show toast for server errors (5xx) - these are bugs that need fixing
      if (response.status >= 500) {
        showGlobalToast(error.getUserMessage(), 'error');
      }

      throw error;
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : (null as unknown as T);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_URL);

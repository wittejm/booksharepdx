/**
 * API Client for making authenticated requests to the backend
 * Uses cookie-based JWT authentication
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

    // Provide fallback messages based on status code
    switch (this.statusCode) {
      case 400:
        return 'The request was invalid. Please check your input and try again.';
      case 401:
        return 'You need to log in to perform this action.';
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
        return 'An unexpected server error occurred. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
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
      throw new ApiError(
        'Unable to connect to the server. This is likely a server configuration error.',
        'NETWORK_ERROR',
        0
      );
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
      throw new ApiError(
        (errorData as any).message || 'Request failed',
        (errorData as any).code || 'UNKNOWN',
        response.status,
        (errorData as any).details
      );
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : (null as unknown as T);
  }

  async get<T>(endpoint: string, _includeCredentials?: boolean): Promise<T> {
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

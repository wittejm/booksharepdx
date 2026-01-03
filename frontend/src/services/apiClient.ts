/**
 * API Client for making authenticated requests to the backend
 * Uses cookie-based JWT authentication
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always send cookies for JWT auth
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        error: { message: response.statusText, code: 'UNKNOWN' },
      }));
      // Backend returns { error: { message, code } }
      const errorData = errorBody.error || errorBody;
      const error = new Error(errorData.message || 'Request failed');
      (error as any).code = errorData.code;
      throw error;
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

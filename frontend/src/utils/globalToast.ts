/**
 * Global toast bridge - allows non-React code (like apiClient) to show toasts
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastListener = (message: string, type: ToastType) => void;

let listener: ToastListener | null = null;

export function setGlobalToastListener(fn: ToastListener | null): void {
  listener = fn;
}

export function showGlobalToast(message: string, type: ToastType = 'error'): void {
  if (listener) {
    listener(message, type);
  } else {
    // Fallback: log to console if no listener registered (e.g., during app init)
    console.error(`[Toast ${type}]:`, message);
  }
}

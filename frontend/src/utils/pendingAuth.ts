// Utility for managing pending actions that require authentication
// Uses localStorage so the action can be restored after login (even in a new tab)

const PENDING_ACTION_KEY = "bookshare_pending_action";
const LOGIN_EVENT_KEY = "bookshare_login_event";

export interface PendingAction {
  type: "request";
  postId: string;
  returnTo: string;
  timestamp: number;
}

// Store a pending action before redirecting to login
export function setPendingAction(
  action: Omit<PendingAction, "timestamp">,
): void {
  const fullAction: PendingAction = {
    ...action,
    timestamp: Date.now(),
  };
  localStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(fullAction));
}

// Get the pending action (if any and not expired)
export function getPendingAction(): PendingAction | null {
  const stored = localStorage.getItem(PENDING_ACTION_KEY);
  if (!stored) return null;

  try {
    const action: PendingAction = JSON.parse(stored);
    // Expire after 30 minutes
    if (Date.now() - action.timestamp > 30 * 60 * 1000) {
      clearPendingAction();
      return null;
    }
    return action;
  } catch {
    clearPendingAction();
    return null;
  }
}

// Clear the pending action
export function clearPendingAction(): void {
  localStorage.removeItem(PENDING_ACTION_KEY);
}

// Build the redirect URL from a pending action
export function buildRedirectUrl(action: PendingAction): string {
  if (action.type === "request") {
    return `/browse?postId=${action.postId}&openRequest=true`;
  }
  return action.returnTo || "/browse";
}

// Broadcast login event to other tabs
export function broadcastLogin(): void {
  // Writing to localStorage triggers 'storage' event in other tabs
  localStorage.setItem(LOGIN_EVENT_KEY, Date.now().toString());
  // Clean up immediately - we just need the event to fire
  localStorage.removeItem(LOGIN_EVENT_KEY);
}

// Listen for login events from other tabs
export function onCrossTabLogin(callback: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === LOGIN_EVENT_KEY && event.newValue) {
      callback();
    }
  };
  window.addEventListener("storage", handler);
  // Return cleanup function
  return () => window.removeEventListener("storage", handler);
}

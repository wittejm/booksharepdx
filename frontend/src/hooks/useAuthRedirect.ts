import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services";
import { useUser } from "../contexts/UserContext";
import {
  getPendingAction,
  clearPendingAction,
  buildRedirectUrl,
  onCrossTabLogin,
} from "../utils/pendingAuth";

/**
 * Hook that handles auth-related redirects for login/signup pages:
 * - Redirects if user is already logged in
 * - Listens for cross-tab login events (e.g., magic link clicked in another tab)
 * - Handles pending action redirects (e.g., user tried to access protected page)
 *
 * @param defaultRedirect - Where to redirect if no pending action (default: "/")
 */
export function useAuthRedirect(defaultRedirect: string = "/") {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useUser();

  const handlePostLoginRedirect = () => {
    const pendingAction = getPendingAction();
    if (pendingAction) {
      const redirectUrl = buildRedirectUrl(pendingAction);
      clearPendingAction();
      navigate(redirectUrl);
    } else {
      navigate(defaultRedirect);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      handlePostLoginRedirect();
    }
  }, [currentUser]);

  // Listen for login events from other tabs (e.g., magic link clicked in another tab)
  useEffect(() => {
    const cleanup = onCrossTabLogin(async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        updateCurrentUser(user);
        handlePostLoginRedirect();
      }
    });
    return cleanup;
  }, []);

  return { handlePostLoginRedirect };
}

import { useConfirm } from "../components/useConfirm";
import { showGlobalToast } from "../utils/globalToast";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  variant?: "danger" | "warning" | "info";
};

/**
 * Hook for the common pattern: confirm dialog → action → toast
 *
 * Handles:
 * - Confirmation dialog
 * - Error handling with toast (always includes server error)
 * - Success toast
 * - Optional onSuccess callback for post-action cleanup
 *
 * Returns the action result, or null if user cancelled.
 * Re-throws errors after showing toast (caller can catch if needed).
 */
export function useConfirmAction() {
  const { confirm, ConfirmDialogComponent } = useConfirm();

  async function confirmAction<T>(
    options: ConfirmOptions,
    action: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string,
    onSuccess?: (result: T) => void | Promise<void>
  ): Promise<T | null> {
    const confirmed = await confirm(options);
    if (!confirmed) return null;

    try {
      const result = await action();
      if (successMessage) showGlobalToast(successMessage, "success");
      if (onSuccess) await onSuccess(result);
      return result;
    } catch (error) {
      const prefix = errorMessage || "Action failed";
      showGlobalToast(`${prefix}: ${(error as Error).message}`, "error");
      throw error;
    }
  }

  return { confirmAction, ConfirmDialogComponent };
}

import { useState, useCallback } from "react";
import ConfirmDialog from "./ConfirmDialog";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  hideCancel?: boolean; // For alert-style dialogs with only one button
}

interface UseConfirmReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: Omit<ConfirmOptions, "hideCancel">) => Promise<void>; // One-button alert
  ConfirmDialogComponent: React.ReactNode;
}

export function useConfirm(): UseConfirmReturn {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolver: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { title: "", message: "" },
    resolver: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        options,
        resolver: resolve,
      });
    });
  }, []);

  const alert = useCallback(
    (options: Omit<ConfirmOptions, "hideCancel">): Promise<void> => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          options: {
            ...options,
            hideCancel: true,
            confirmText: options.confirmText || "OK",
          },
          resolver: () => resolve(),
        });
      });
    },
    [],
  );

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleClose = useCallback(() => {
    if (dialogState.resolver) {
      dialogState.resolver(false);
    }
    setDialogState({
      open: false,
      options: { title: "", message: "" },
      resolver: null,
    });
  }, [dialogState.resolver]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleConfirm = useCallback(() => {
    if (dialogState.resolver) {
      dialogState.resolver(true);
    }
    setDialogState({
      open: false,
      options: { title: "", message: "" },
      resolver: null,
    });
  }, [dialogState.resolver]);

  const ConfirmDialogComponent = (
    <ConfirmDialog
      open={dialogState.open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={dialogState.options.title}
      message={dialogState.options.message}
      confirmText={dialogState.options.confirmText}
      cancelText={dialogState.options.cancelText}
      variant={dialogState.options.variant}
      hideCancel={dialogState.options.hideCancel}
    />
  );

  return { confirm, alert, ConfirmDialogComponent };
}

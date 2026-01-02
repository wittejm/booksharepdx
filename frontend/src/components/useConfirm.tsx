import { useState, useCallback } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface UseConfirmReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  ConfirmDialogComponent: React.ReactNode;
}

export function useConfirm(): UseConfirmReturn {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolver: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { title: '', message: '' },
    resolver: null
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        options,
        resolver: resolve
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (dialogState.resolver) {
      dialogState.resolver(false);
    }
    setDialogState({
      open: false,
      options: { title: '', message: '' },
      resolver: null
    });
  }, [dialogState.resolver]);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolver) {
      dialogState.resolver(true);
    }
    setDialogState({
      open: false,
      options: { title: '', message: '' },
      resolver: null
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
    />
  );

  return { confirm, ConfirmDialogComponent };
}

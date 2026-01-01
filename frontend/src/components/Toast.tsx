import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss?: (id: string) => void;
}

export default function Toast({ id, message, type = 'info', duration = 3000, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onDismiss]);

  if (!isVisible) return null;

  const styles = {
    success: {
      bg: 'bg-green-500',
      icon: <CheckCircle className="w-5 h-5" />,
    },
    error: {
      bg: 'bg-red-500',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    warning: {
      bg: 'bg-yellow-500',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    info: {
      bg: 'bg-blue-500',
      icon: <AlertCircle className="w-5 h-5" />,
    },
  };

  const style = styles[type];

  const handleClose = () => {
    setIsVisible(false);
    onDismiss?.(id);
  };

  return (
    <div className={`${style.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md animate-fade-in`}>
      <div className="flex-shrink-0">
        {style.icon}
      </div>
      <div className="flex-grow text-sm">{message}</div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-2 hover:opacity-80 transition-opacity"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

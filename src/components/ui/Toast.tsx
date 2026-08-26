'use client';

import { useAppStore } from '@/stores';

interface ToastProps {}

export default function Toast({}: ToastProps) {
  const { toast, hideToast } = useAppStore();

  if (!toast) return null;

  return (
    <div className="toast-container animate-slide-up">
      <div className="toast glass-heavy">
        <span className="toast-message">{toast.message}</span>
        {toast.action && toast.actionLabel && (
          <button
            className="toast-action"
            onClick={() => {
              toast.action?.();
              hideToast();
            }}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>

      
    </div>
  );
}

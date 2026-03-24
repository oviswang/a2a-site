'use client';

import { useEffect } from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

export function Toast({
  message,
  variant = 'info',
  onClose,
  autoHideMs,
}: {
  message: string | null;
  variant?: ToastVariant;
  onClose: () => void;
  autoHideMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    if (!autoHideMs) return;
    const t = setTimeout(() => onClose(), autoHideMs);
    return () => clearTimeout(t);
  }, [message, autoHideMs, onClose]);

  if (!message) return null;

  const styles =
    variant === 'success'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
      : variant === 'error'
        ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
        : 'border-sky-400/30 bg-sky-500/10 text-sky-100';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs ${styles}`}>
      <div className="min-w-0">{message}</div>
      <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10" onClick={onClose}>
        Dismiss
      </button>
    </div>
  );
}

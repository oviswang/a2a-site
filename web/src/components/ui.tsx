'use client';

import type { ReactNode } from 'react';

type BtnVariant = 'default' | 'primary' | 'success' | 'danger' | 'ghost';
type BtnSize = 'sm' | 'md';

export function Button({
  variant = 'default',
  size = 'md',
  disabled,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300/30 disabled:opacity-50 disabled:cursor-not-allowed';
  const sz = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  const v =
    variant === 'primary'
      ? 'border-transparent bg-sky-400/20 text-sky-100 hover:bg-sky-400/25'
      : variant === 'success'
        ? 'border-transparent bg-emerald-700 text-white hover:bg-emerald-600'
        : variant === 'danger'
          ? 'border-transparent bg-rose-700 text-white hover:bg-rose-600'
          : variant === 'ghost'
            ? 'border-transparent bg-transparent text-slate-100 hover:bg-white/5'
            : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10';

  return (
    <button className={`${base} ${sz} ${v} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-200/40 outline-none focus:border-sky-300/40 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-200/40 outline-none focus:border-sky-300/40 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 ${className}`} {...props}>
      {children}
    </select>
  );
}

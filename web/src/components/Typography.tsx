import type { ReactNode } from 'react';

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">{children}</h1>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight text-slate-50">{children}</h2>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <div className="text-sm text-slate-200/60">{children}</div>;
}

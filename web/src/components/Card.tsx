import type { ReactNode } from 'react';

export function Card({ title, children, footer }: { title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--a2a-border)] bg-[color:var(--a2a-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
      {title ? <div className="mb-3 text-sm font-semibold text-slate-50">{title}</div> : null}
      <div className="text-sm text-slate-200/90">{children}</div>
      {footer ? <div className="mt-4 border-t border-[color:var(--a2a-border)] pt-4 text-xs text-slate-200/70">{footer}</div> : null}
    </div>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' }) {
  const cls =
    tone === 'brand'
      ? 'bg-sky-400/15 text-sky-200 border-sky-300/25'
      : 'bg-white/5 text-slate-200/80 border-white/10';
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

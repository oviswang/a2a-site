import type { ReactNode } from 'react';

export function Card({ title, children, footer }: { title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      {title ? (
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-50 tracking-wide">{title}</div>
      ) : null}
      <div className="px-4 py-3 text-sm leading-relaxed text-slate-200/90">{children}</div>
      {footer ? <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-200/70">{footer}</div> : null}
    </div>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' }) {
  const cls =
    tone === 'brand'
      ? 'inline-flex items-center rounded-full border border-sky-300/25 bg-sky-400/15 px-2 py-0.5 text-xs text-sky-200'
      : 'inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-200/80';
  return <span className={cls}>{children}</span>;
}

import type { ReactNode } from 'react';
import Link from 'next/link';

const UI_BUILD = process.env.NEXT_PUBLIC_UI_BUILD || 'dev';

export function Breadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <div className="text-xs text-slate-200/60">
      {items.map((it, idx) => (
        <span key={idx}>
          {idx > 0 ? <span className="mx-2 text-slate-200/20">/</span> : null}
          {it.href ? (
            <Link className="hover:text-slate-50" href={it.href}>
              {it.label}
            </Link>
          ) : (
            <span className="text-slate-50">{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/10 pb-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          {breadcrumbs ? breadcrumbs : null}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div>{title}</div>
            <span
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-200/70"
              style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
              aria-label={`UI build ${UI_BUILD}`}
            >
              UI_BUILD: {UI_BUILD}
            </span>
          </div>
          {subtitle ? <div>{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

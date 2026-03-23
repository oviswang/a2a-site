import type { ReactNode } from 'react';
import Link from 'next/link';

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
  title: string;
  subtitle?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/10 pb-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          {breadcrumbs ? breadcrumbs : null}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-200/70">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

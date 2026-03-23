import type { ReactNode } from 'react';

export function Card({ title, children, footer }: { title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      {title ? <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div> : null}
      <div className="text-sm text-slate-700">{children}</div>
      {footer ? <div className="mt-4 border-t pt-4 text-xs text-slate-600">{footer}</div> : null}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{children}</span>;
}

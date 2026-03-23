import type { ReactNode } from 'react';

export function StatusBadge({ status }: { status: 'needs_review' | 'approved' | 'changes_requested' }) {
  const m: Record<string, { label: string; cls: string }> = {
    needs_review: { label: 'Needs review', cls: 'bg-slate-100 text-slate-700' },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800' },
    changes_requested: { label: 'Changes requested', cls: 'bg-amber-100 text-amber-900' },
  };
  const x = m[status] || { label: status, cls: 'bg-slate-100 text-slate-700' };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${x.cls}`}>{x.label}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="rounded border bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">{children}</span>;
}

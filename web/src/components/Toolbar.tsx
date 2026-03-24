'use client';

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/10 bg-[color:var(--a2a-surface)] px-3 py-2">{children}</div>;
}

export function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2">{children}</div>;
}

export function ToolbarLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] text-slate-200/60">{label}</span>
      {children}
    </label>
  );
}

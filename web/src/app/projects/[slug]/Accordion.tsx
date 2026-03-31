'use client';

import { useState } from 'react';

export function AccordionSection(props: {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { id, title, subtitle, defaultOpen, right, children } = props;
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <section id={id} className="scroll-mt-24">
      <div className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface-strong)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 rounded-3xl px-5 py-4 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-50">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-slate-200/60">{subtitle}</div> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {right}
            <span className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100">
              {open ? 'Hide' : 'Show'}
            </span>
          </div>
        </button>

        {open ? <div className="px-5 pb-5">{children}</div> : null}
      </div>
    </section>
  );
}


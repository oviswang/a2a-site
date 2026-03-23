import type { ReactNode } from 'react';
import { Nav } from './Nav';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      <footer className="mt-10 border-t border-white/10 bg-black/10">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-200/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="font-semibold text-slate-100">a2a.fun</span>
              <span className="text-slate-400"> · </span>
              <span>collaboration loop prototype</span>
            </span>
            <span>
              <a className="underline decoration-white/30 hover:decoration-white/60" href="/release.json">
                /release.json
              </a>{' '}
              <span className="text-slate-500">•</span>{' '}
              <a className="underline decoration-white/30 hover:decoration-white/60" href="/skill.md">
                /skill.md
              </a>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-300/60">Internal repo/workspace name: a2a-site</div>
        </div>
      </footer>
    </div>
  );
}

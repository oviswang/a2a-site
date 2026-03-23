import type { ReactNode } from 'react';
import { Nav } from './Nav';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      <footer className="mt-10 border-t border-white/10 bg-black/10">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-200/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-slate-200/80">© 2026 A2A.</span>
            <span className="flex flex-wrap items-center gap-2">
              <a className="underline decoration-white/20 hover:decoration-white/50" href="/faq">
                FAQ
              </a>
              <span className="text-slate-500">·</span>
              <a className="underline decoration-white/20 hover:decoration-white/50" href="/terms">
                Terms
              </a>
              <span className="text-slate-500">·</span>
              <a className="underline decoration-white/20 hover:decoration-white/50" href="/privacy">
                Privacy
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Nav } from './Nav';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-600">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>A2A Site MVP • Static prototype</span>
            <span>
              <a className="underline" href="/release.json">/release.json</a> •{' '}
              <a className="underline" href="/skill.md">/skill.md</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

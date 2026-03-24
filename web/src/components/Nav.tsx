'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/state';
import { Button } from '@/components/ui';

const nav = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/projects', label: 'Projects', icon: '📁' },
  { href: '/start', label: 'Start', icon: '🚀' },
  { href: '/inbox', label: 'Inbox', icon: '📥' },
  { href: '/login', label: 'Sign in', icon: '🔐' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/identities', label: 'Identities', icon: '🪪' },
];

export function Nav() {
  const { state, actions } = useWorkspace();
  const actor = state.actor;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (actor.actorType !== 'human') return;
    fetch(`/api/inbox?userHandle=${encodeURIComponent(actor.handle)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setUnread(Number(j?.unread || 0)))
      .catch(() => void 0);
  }, [actor.handle, actor.actorType]);

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[color:var(--a2a-surface-strong)] backdrop-blur relative">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Image
            src="/brand/logo-20260324.jpg"
            alt="a2a.fun"
            width={28}
            height={28}
            className="rounded-lg"
            priority
          />
          <div className="text-sm font-semibold text-slate-50 no-underline" style={{ paddingLeft: 2 }}>  a2a.fun</div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 md:flex">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`text-sm ${active ? 'text-slate-50' : 'text-slate-200/70 hover:text-slate-50'}`}
              >
                <span className={`inline-flex items-center gap-2 ${active ? 'rounded-lg bg-white/5 px-2 py-1' : ''}`}>
                  {n.label}
                  {n.href === '/inbox' && unread > 0 ? (
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-100">{unread}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
          <div className="ml-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200/80">
            <span className="text-slate-200/60">@{actor.handle}</span>
            <span className="rounded-lg bg-sky-400/10 px-1.5 py-0.5 text-sky-200">{actor.actorType}</span>
            {actor.actorType === 'human' && actor.handle !== 'local-human' ? (
              <button type="button" className="rounded-lg bg-rose-500/15 px-2 py-1 text-rose-100 hover:bg-rose-500/20" onClick={() => actions.setActor({ handle: 'local-human', actorType: 'human' })}>
                Sign out
              </button>
            ) : null}
            <div className="ml-1 inline-flex overflow-hidden rounded-lg border border-white/10">
              <button
                type="button"
                className={`px-2 py-1 ${actor.actorType === 'human' ? 'bg-sky-400/20 text-sky-100' : 'hover:bg-white/5'}`}
                onClick={() => actions.setActor({ handle: 'local-human', actorType: 'human' })}
              >
                H
              </button>
              <button
                type="button"
                className={`px-2 py-1 ${actor.actorType === 'agent' ? 'bg-sky-400/20 text-sky-100' : 'hover:bg-white/5'}`}
                onClick={() => actions.setActor({ handle: 'local-agent', actorType: 'agent' })}
              >
                A
              </button>
            </div>
          </div>
        </div>

        {/* Mobile hamburger (right aligned, icon only) */}
        <div className="md:hidden">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            aria-label="Menu"
            className="px-2 py-2"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ color: '#fff' }}>
              <path d="M2 4.25h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 11.75h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Button>
        </div>
      </div>

      {open ? (
        <div className="md:hidden">
          {/* Backdrop (click outside to close) */}
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setOpen(false)} />

          {/* Dropdown panel (anchored to top-right) */}
          <div
            className="absolute right-3 top-full z-[70] mt-2 w-[320px] max-w-[88vw] rounded-xl border border-white/10 bg-[#050816] shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
            style={{ position: 'fixed', right: 8, top: 56, left: 'auto', zIndex: 70 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
              <div className="text-xs text-slate-200/70">
                <span className="text-slate-200/50">@</span>
                <span className="font-mono text-slate-100">{actor.handle}</span>
                <span className="text-slate-200/50"> · {actor.actorType}</span>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Close" className="px-2 py-1">
                ×
              </Button>
            </div>

            <div className="px-3 py-3">
              <div className="mb-3 flex gap-2">
                <Button type="button" size="sm" variant={actor.actorType === 'human' ? 'primary' : 'default'} onClick={() => actions.setActor({ handle: 'local-human', actorType: 'human' })}>
                  Human
                </Button>
                <Button type="button" size="sm" variant={actor.actorType === 'agent' ? 'primary' : 'default'} onClick={() => actions.setActor({ handle: 'local-agent', actorType: 'agent' })}>
                  Agent
                </Button>
              </div>

              <div className="grid gap-1">
                {nav.map((n) => {
                  const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href));
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? 'bg-white/5 text-slate-50' : 'text-slate-200/80 hover:bg-white/5 hover:text-slate-50'}`}
                    >
                      {active ? <span className="absolute left-0 top-2 h-6 w-1 rounded-r bg-sky-300" /> : null}
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[12px] text-slate-100">
                        {n.icon}
                      </span>
                      <span className="flex-1">{n.label}</span>
                      {n.href === '/inbox' && unread > 0 ? <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-100">{unread}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

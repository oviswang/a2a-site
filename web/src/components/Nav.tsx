'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWorkspace } from '@/lib/state';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/start', label: 'Start' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/login', label: 'Sign in' },
  { href: '/settings', label: 'Settings' },
  { href: '/users', label: 'Users' },
  { href: '/identities', label: 'Identities' },
  { href: '/demo', label: 'Demo' },
];

export function Nav() {
  const { state, actions } = useWorkspace();
  const actor = state.actor;
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
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[color:var(--a2a-surface-strong)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-6 no-underline">
          <Image
            src="/brand/logo-20260324.jpg"
            alt="a2a.fun"
            width={34}
            height={34}
            className="rounded-xl"
            priority
          />
          <div className="text-sm font-semibold text-slate-50 no-underline">{'\u00A0\u00A0'}a2a.fun</div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-slate-200/70 hover:text-slate-50">
              <span className="inline-flex items-center gap-2">
                {n.label}
                {n.href === '/inbox' && unread > 0 ? (
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-100">{unread}</span>
                ) : null}
              </span>
            </Link>
          ))}
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

        {/* Mobile menu */}
        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-black/20 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/70">
              Acting as <span className="font-mono">@{actor.handle}</span> ({actor.actorType})
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className={`rounded-xl border border-white/10 px-3 py-2 ${actor.actorType === 'human' ? 'bg-sky-400/20 text-sky-100' : 'hover:bg-white/5'}`}
                  onClick={() => actions.setActor({ handle: 'local-human', actorType: 'human' })}
                >
                  Human
                </button>
                <button
                  type="button"
                  className={`rounded-xl border border-white/10 px-3 py-2 ${actor.actorType === 'agent' ? 'bg-sky-400/20 text-sky-100' : 'hover:bg-white/5'}`}
                  onClick={() => actions.setActor({ handle: 'local-agent', actorType: 'agent' })}
                >
                  Agent
                </button>
              </div>
            </div>

            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                onClick={() => setOpen(false)}
              >
                <span className="inline-flex items-center gap-2">
                  {n.label}
                  {n.href === '/inbox' && unread > 0 ? (
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-100">{unread}</span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/state';

const nav = [
  { href: '/projects', label: 'Projects', icon: '📁' },
  { href: '/inbox', label: 'Inbox', icon: '📥' },
  { href: '/users', label: 'Users', icon: '👥' },
];

export function Nav() {
  const { state, actions } = useWorkspace();
  const actor = state.actor;
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Session → UI sync: if server has a signed-in human, reflect it in the visible actor.
    fetch('/api/auth/whoami', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.signedIn && j?.actorType === 'human' && typeof j?.handle === 'string' && j.handle && j.handle !== actor.handle) {
          actions.setActor({ handle: j.handle, actorType: 'human' });
        }
      })
      .catch(() => void 0);
  }, [actions, actor.handle]);

  const signedInHuman = actor.actorType === 'human' && actor.handle !== 'guest' && actor.handle !== 'local-human';
  const profileHref = signedInHuman ? '/me' : '/login';

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
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <div
            className="text-base font-black tracking-wide text-slate-50 no-underline"
            style={{ paddingLeft: 8, WebkitTextStroke: '0.25px rgba(255,255,255,0.25)' }}
          >
            a2a.fun
          </div>
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

          <Link
            href="/inbox"
            aria-label="Inbox"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-50 hover:bg-white/10"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 4h16v12H4V4Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 16l4 4h8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-[1px] text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_rgba(15,23,42,0.9)]">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </Link>

          <Link
            href={profileHref}
            aria-label="Profile"
            className="ml-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-50 hover:bg-white/10"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c1.8-4 13.2-4 16 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {/* Mobile top-right: Inbox + Profile (icon buttons) */}
        <div className="md:hidden flex items-center gap-3">
          <Link
            href="/inbox"
            aria-label="Inbox"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-50 hover:bg-white/10"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 4h16v12H4V4Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 16l4 4h8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-[1px] text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_rgba(15,23,42,0.9)]">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </Link>

          <Link
            href={profileHref}
            aria-label="Profile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-50 hover:bg-white/10"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c1.8-4 13.2-4 16 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LINKS } from '@/lib/links';
import { useWorkspace } from '@/lib/state';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/demo', label: 'Demo' },
  { href: '/projects', label: 'Projects' },
  { href: '/identities', label: 'Identities' },
];

export function Nav() {
  const { state, actions } = useWorkspace();
  const actor = state.actor;

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[color:var(--a2a-surface-strong)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/mascot.jpg"
              alt="a2a.fun mascot"
              width={36}
              height={36}
              className="rounded-xl border border-white/10 shadow"
              priority
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-50">a2a.fun</div>
              <div className="text-xs text-slate-200/60">humans + agents building together</div>
            </div>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 text-sm">
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200/80 md:flex">
            <span className="text-slate-200/60">Acting as</span>
            <span className="font-mono">@{actor.handle}</span>
            <span className="rounded-lg bg-sky-400/10 px-1.5 py-0.5 text-sky-200">{actor.actorType}</span>
            <div className="ml-2 inline-flex overflow-hidden rounded-lg border border-white/10">
              <button
                type="button"
                className={`px-2 py-1 ${actor.actorType === 'human' ? 'bg-sky-400/20 text-sky-100' : 'bg-transparent hover:bg-white/5'}`}
                onClick={() => actions.setActor({ handle: 'local-human', actorType: 'human' })}
              >
                Human
              </button>
              <button
                type="button"
                className={`px-2 py-1 ${actor.actorType === 'agent' ? 'bg-sky-400/20 text-sky-100' : 'bg-transparent hover:bg-white/5'}`}
                onClick={() => actions.setActor({ handle: 'local-agent', actorType: 'agent' })}
              >
                Agent
              </button>
            </div>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-slate-200/70 hover:text-slate-50">
                {n.label}
              </Link>
            ))}
          </div>

          <a className="text-slate-200/70 hover:text-slate-50" href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="rounded-xl bg-sky-400/20 px-3 py-1.5 text-sky-100 hover:bg-sky-400/25" href={LINKS.skill}>
            Install
          </a>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { LINKS } from '@/lib/links';
import { useWorkspace } from '@/lib/state';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/identities', label: 'Identities' },
];

export function Nav() {
  const { state, actions } = useWorkspace();
  const actor = state.actor;

  return (
    <div className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold text-slate-900">
            A2A
          </Link>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">site</span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 text-sm">
          <div className="hidden items-center gap-2 rounded border px-2 py-1 text-xs text-slate-700 md:flex">
            <span className="text-slate-500">Acting as</span>
            <span className="font-mono">@{actor.handle}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5">{actor.actorType}</span>
            <div className="ml-2 inline-flex overflow-hidden rounded border">
              <button
                type="button"
                className={`px-2 py-1 ${actor.actorType === 'human' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
                onClick={() => actions.setActor({ handle: 'local-human', actorType: 'human' })}
              >
                Human
              </button>
              <button
                type="button"
                className={`px-2 py-1 ${actor.actorType === 'agent' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
                onClick={() => actions.setActor({ handle: 'local-agent', actorType: 'agent' })}
              >
                Agent
              </button>
            </div>
          </div>

          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-slate-700 hover:text-slate-900">
              {n.label}
            </Link>
          ))}
          <a className="text-slate-700 hover:text-slate-900" href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800" href={LINKS.skill}>
            Install
          </a>
        </div>
      </div>
    </div>
  );
}

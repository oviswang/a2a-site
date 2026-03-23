'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';

const PRIMARY_PROJECT = '/projects/a2a-site';

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const normalized = useMemo(() => q.trim(), [q]);

  return (
    <Layout>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {/* 1) Top brand area */}
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute -inset-8 rounded-[32px] bg-sky-400/10 blur-2xl" />
            <Image
              src="/brand/mascot.jpg"
              alt="a2a.fun"
              width={140}
              height={140}
              className="relative rounded-[28px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
              priority
            />
          </div>
          <div>
            <div className="text-3xl font-semibold tracking-tight text-slate-50">a2a.fun</div>
            <div className="mt-1 text-sm text-slate-200/70">Collaborative agents at work — structured, traceable, calm.</div>
          </div>
        </section>

        {/* 2) Search area */}
        <section className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur sm:p-6">
          <div className="text-xs font-semibold text-slate-200/70">Search</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-200/40 outline-none focus:border-sky-300/40"
              placeholder="Search projects, tasks, agents…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/projects${normalized ? `?q=${encodeURIComponent(normalized)}` : ''}`);
                }
              }}
            />
            <button
              type="button"
              className="rounded-2xl bg-sky-400/20 px-4 py-3 text-sm text-sky-100 hover:bg-sky-400/25"
              onClick={() => router.push(`/projects${normalized ? `?q=${encodeURIComponent(normalized)}` : ''}`)}
            >
              Search
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-200/50">Tip: try “task”, “agent”, or a project slug.</div>
        </section>

        {/* 3) Primary actions */}
        <section className="grid gap-3 sm:grid-cols-2">
          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7" href={PRIMARY_PROJECT}>
            <div className="text-sm font-semibold text-slate-50">Open a2a-site</div>
            <div className="mt-1 text-xs text-slate-200/60">Default live project (dogfooding workspace)</div>
          </Link>

          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7" href="/projects">
            <div className="text-sm font-semibold text-slate-50">Explore Projects</div>
            <div className="mt-1 text-xs text-slate-200/60">Browse workspaces and collaboration history</div>
          </Link>

          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7" href="/projects/new">
            <div className="text-sm font-semibold text-slate-50">Create Project</div>
            <div className="mt-1 text-xs text-slate-200/60">Start a new workspace (tasks → proposals → merge)</div>
          </Link>

          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7" href={`${PRIMARY_PROJECT}#join-agent`}>
            <div className="text-sm font-semibold text-slate-50">Join as Agent</div>
            <div className="mt-1 text-xs text-slate-200/60">External agent intake shell (safe, no automation)</div>
          </Link>
        </section>

        {/* 4) Optional lightweight secondary section */}
        <section className="grid gap-3 sm:grid-cols-3">
          <Card title="Loop" footer={<Tag tone="brand">tasks → proposals</Tag>}>
            Work is structured as tasks. Changes are proposed and reviewed.
          </Card>
          <Card title="Merge" footer={<Tag tone="brand">traceable</Tag>}>
            Merge updates files and completes linked tasks.
          </Card>
          <Card title="Presence" footer={<Tag tone="brand">human + agent</Tag>}>
            Members and identities stay visible and product-real.
          </Card>
        </section>
      </div>
    </Layout>
  );
}

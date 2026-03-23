'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';

const PRIMARY_PROJECT = '/projects/a2a-site';

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const normalized = useMemo(() => q.trim(), [q]);

  return (
    <Layout>
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-1">
        {/* 1) Brand */}
        <section className="flex flex-col items-center gap-4 pt-2 text-center">
          <div className="relative">
            <div className="absolute -inset-8 rounded-[32px] bg-sky-400/10 blur-2xl" />
            <Image
              src="/brand/hero.jpg"
              alt="a2a.fun"
              width={240}
              height={240}
              className="relative rounded-[30px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
              priority
            />
          </div>

        </section>

        {/* 2) Search */}
        <section className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur sm:p-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <input
              className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-200/40 outline-none focus:border-sky-300/40"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') router.push(`/search${normalized ? `?q=${encodeURIComponent(normalized)}` : ''}`);
              }}
              aria-label="Search"
            />
            <button
              type="button"
              className="w-full shrink-0 rounded-2xl bg-sky-400/20 px-4 py-3 text-sm text-sky-100 hover:bg-sky-400/25 sm:w-auto"
              onClick={() => router.push(`/search${normalized ? `?q=${encodeURIComponent(normalized)}` : ''}`)}
            >
              Search
            </button>
          </div>
        </section>

        {/* 3) Primary actions */}
        <section className="grid gap-3">
          <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10" href={PRIMARY_PROJECT}>
            <div className="text-base font-semibold text-slate-50">Open a2a-site</div>
            <div className="mt-1 text-xs text-slate-200/60">Live workspace</div>
          </Link>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10" href="/projects">
              <div className="text-base font-semibold text-slate-50">Explore Projects</div>
              <div className="mt-1 text-xs text-slate-200/60">Browse workspaces</div>
            </Link>

            <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10" href={`${PRIMARY_PROJECT}#join-agent`}>
              <div className="text-base font-semibold text-slate-50">Join as Agent</div>
              <div className="mt-1 text-xs text-slate-200/60">Intake shell</div>
            </Link>

            <Link className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 sm:col-span-2" href="/projects/new">
              <div className="text-base font-semibold text-slate-50">Create Project</div>
              <div className="mt-1 text-xs text-slate-200/60">New workspace</div>
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';

function isInLast7Days(p: any) {
  const now = Date.now();
  const created = p?.createdAt ? new Date(p.createdAt).getTime() : 0;
  return Boolean(created && now - created <= 7 * 24 * 60 * 60 * 1000);
}

function createdAtMs(p: any) {
  return p?.createdAt ? new Date(p.createdAt).getTime() : 0;
}

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const normalized = useMemo(() => q.trim(), [q]);

  const [hot7dTop10, setHot7dTop10] = useState<any[]>([]);

  // No new systems: derive “hot” from existing /api/projects payload.
  // Keep it lightweight and deterministic for the homepage.
  useMemo(() => {
    fetch('/api/projects', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = Array.isArray(j?.projects) ? j.projects : [];
        const top = [...list]
          .filter((p) => isInLast7Days(p))
          // Hot(7d) = newest first (createdAt desc)
          .sort((a, b) => createdAtMs(b) - createdAtMs(a))
          .slice(0, 10);
        setHot7dTop10(top);
      })
      .catch(() => void 0);
    return null;
  }, []);

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

        {/* 4) Hot projects (last 7 days) */}
        <section className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-50">Hot projects</div>
              <div className="mt-1 text-xs text-slate-200/60">Top 10 in the last 7 days</div>
            </div>
            <Link className="text-xs text-sky-200 hover:text-sky-100" href="/projects">
              More →
            </Link>
          </div>

          <div className="mt-3 grid gap-2">
            {hot7dTop10.map((p) => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                style={{
                  display: 'block',
                  marginBottom: 12,
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(15,23,42,0.72)',
                  textDecoration: 'none',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold tracking-tight text-slate-50 hover:text-white">{p.name}</div>
                      <span className="font-mono text-[11px] text-slate-200/45">/{p.slug}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          p.visibility === 'open'
                            ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
                            : 'border-amber-400/35 bg-amber-400/10 text-amber-100'
                        }`}
                      >
                        {p.visibility === 'restricted' ? 'Restricted' : 'Open'}
                      </span>
                    </div>

                    <div className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-200/70">{p.summary}</div>

                    {Array.isArray(p.tags) && p.tags.length ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {p.tags.slice(0, 5).map((t: string) => (
                          <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200/80">
                            {t}
                          </span>
                        ))}
                        {p.tags.length > 5 ? <span className="text-[11px] text-slate-200/45">+{p.tags.length - 5}</span> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-slate-200/40">→</div>
                </div>
              </Link>
            ))}
            {!hot7dTop10.length ? <div className="text-xs text-slate-200/60">No recent projects yet.</div> : null}
          </div>

          <div className="mt-3">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
              style={{ textDecoration: 'none' }}
            >
              More
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}

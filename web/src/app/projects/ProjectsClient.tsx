'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tag } from '@/components/Card';
import { Button, Input } from '@/components/ui';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { H1, Muted } from '@/components/Typography';
import { useWorkspace } from '@/lib/state';

export function ProjectsClient() {
  const { state } = useWorkspace();
  const router = useRouter();
  const sp = useSearchParams();
  const qRaw = (sp.get('q') || '').trim();
  const [query, setQuery] = useState(qRaw);
  const q = query.trim().toLowerCase();
  const projects = q
    ? state.projects.filter((p) => `${p.slug} ${p.name} ${p.summary}`.toLowerCase().includes(q))
    : state.projects;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <H1>{q ? `Projects — filtered` : 'Projects'}</H1>
                <span
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-200/70"
                  style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
                >
                  UI_BUILD: 5a2158b
                </span>
              </div>
              <Muted>{q ? `query: ${q}` : 'GitHub-like workspaces view (dense, readable).'}</Muted>
            </div>
          }
          subtitle={undefined}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Projects' }]} />}
          actions={
            <div className="flex gap-2">
              <Link className="rounded-lg bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25" href="/projects/new">
                New project
              </Link>
            </div>
          }
        />

        <form
          className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/10 bg-[color:var(--a2a-surface)] px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = query.trim();
            router.push(v ? `/projects?q=${encodeURIComponent(v)}` : '/projects');
          }}
        >
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-200/60">Filter projects</span>
            <Input
              className="w-[320px] max-w-[85vw] px-2 py-1 text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="slug / name / summary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-200/60">{projects.length} projects</div>
            <Button type="submit" variant="primary" size="sm">
              Apply
            </Button>
            {query.trim() ? (
              <Button type="button" size="sm" onClick={() => router.push('/projects')}>
                Clear
              </Button>
            ) : null}
          </div>
        </form>

        <div className="grid gap-3">
          {projects.map((p) => {
            const visLabel = p.visibility === 'open' ? 'Open' : p.visibility === 'restricted' ? 'Restricted' : p.visibility;
            const visTone = p.visibility === 'open' ? 'border-emerald-400/35' : p.visibility === 'restricted' ? 'border-amber-400/35' : 'border-white/10';

            return (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className={`group block rounded-xl border ${visTone} bg-[color:var(--a2a-surface)] px-4 py-4 hover:bg-[color:var(--a2a-surface-strong)]`}
                // Inline fallback styles (for mobile readers / forced styles): keep spacing + card separation unmistakable.
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
                      <div className="text-base font-semibold tracking-tight text-slate-50 group-hover:text-white">{p.name}</div>
                      <span className="font-mono text-[11px] text-slate-200/45">/{p.slug}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          p.visibility === 'open'
                            ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
                            : p.visibility === 'restricted'
                              ? 'border-amber-400/35 bg-amber-400/10 text-amber-100'
                              : 'border-white/10 bg-white/5 text-slate-200/80'
                        }`}
                      >
                        {visLabel}
                      </span>
                    </div>

                    <div className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-200/70">{p.summary}</div>

                    {p.tags.length ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {p.tags.slice(0, 5).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                        {p.tags.length > 5 ? <span className="text-[11px] text-slate-200/45">+{p.tags.length - 5}</span> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-slate-200/40 group-hover:text-slate-200/70">→</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

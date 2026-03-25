'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tag } from '@/components/Card';
import { SafeCardLink } from '@/components/SafeCardLink';
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

  const projectsRaw = q
    ? state.projects.filter((p) => `${p.slug} ${p.name} ${p.summary}`.toLowerCase().includes(q))
    : state.projects;

  // Default sorting: newest first (createdAt desc), fallback to slug.
  const projectsSorted = useMemo(() => {
    return [...projectsRaw].sort((a, b) => {
      const ac = String(a.createdAt || '');
      const bc = String(b.createdAt || '');
      if (ac && bc && ac !== bc) return bc.localeCompare(ac);
      return String(a.slug).localeCompare(String(b.slug));
    });
  }, [projectsRaw]);

  // Mobile-first paging: render at most N, then load more.
  const PAGE_SIZE = 30;
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Reset paging when query changes.
  useMemo(() => {
    setLimit(PAGE_SIZE);
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const projects = useMemo(() => projectsSorted.slice(0, limit), [projectsSorted, limit]);
  const hasMore = projectsSorted.length > projects.length;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={
            <div className="flex flex-col gap-1">
              <H1>{q ? `Projects — filtered` : 'Projects'}</H1>
              <Muted>{q ? `query: ${q}` : 'A calm workspace for projects: tasks → proposals → reviews → merges → history.'}</Muted>
            </div>
          }
          subtitle={undefined}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Projects' }]} />}
          actions={
            <div className="flex gap-2">
              <Link className="rounded-xl bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25" href="/projects/new">
                New project
              </Link>
            </div>
          }
        />

        <form
          className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
          onSubmit={(e) => {
            e.preventDefault();
            const v = query.trim();
            router.push(v ? `/projects?q=${encodeURIComponent(v)}` : '/projects');
          }}
        >
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-200/60">Filter projects</span>
            <Input
              className="w-[320px] max-w-[85vw] rounded-xl px-3 py-2 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="slug / name / summary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-200/60">{projectsSorted.length} projects</div>
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

        <div className="grid gap-4">
          {hasMore ? (
            <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] px-4 py-3 text-sm text-slate-200/70">
              Showing {projects.length} of {projectsSorted.length} projects.
            </div>
          ) : null}
          {projects.map((p) => {
            const visLabel = p.visibility === 'open' ? 'Open' : p.visibility === 'restricted' ? 'Restricted access' : p.visibility;
            const visTone = p.visibility === 'open' ? 'border-emerald-400/35' : p.visibility === 'restricted' ? 'border-amber-400/35' : 'border-white/10';

            return (
              <SafeCardLink
                key={p.slug}
                href={`/projects/${p.slug}`}
                className={`group block rounded-2xl border ${visTone} bg-[color:var(--a2a-surface)] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.14)] hover:border-white/20 hover:bg-[color:var(--a2a-surface-strong)]`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold tracking-tight text-slate-50 group-hover:text-white">{p.name}</div>
                      <span className="font-mono text-[11px] text-slate-200/40">/{p.slug}</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
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

                    <div className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-200/70">{p.summary}</div>

                    {p.tags.length ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {p.tags.slice(0, 2).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                        {p.tags.length > 2 ? <span className="text-[11px] text-slate-200/45">+{p.tags.length - 2}</span> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-slate-200/40 group-hover:text-slate-200/70">→</div>
                </div>
              </SafeCardLink>
            );
          })}
          {hasMore ? (
            <div className="mt-2 flex justify-center">
              <Button type="button" variant="default" size="sm" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}

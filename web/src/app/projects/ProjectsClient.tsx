'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tag } from '@/components/Card';
import { Button, Input } from '@/components/ui';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
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
          title={q ? `Search: ${q}` : 'Projects'}
          subtitle={q ? 'Filtered results' : 'Persistent local workspaces.'}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Projects' }]} />}
          actions={
            <div className="flex gap-2">
              <Link className="rounded-xl bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25" href="/projects/new">
                Create Project
              </Link>
            </div>
          }
        />

        <form
          className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const v = query.trim();
            router.push(v ? `/projects?q=${encodeURIComponent(v)}` : '/projects');
          }}
        >
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-200/60">Filter</span>
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

        <div className="rounded-xl border border-white/10 bg-[color:var(--a2a-surface)]">
          {projects.map((p, idx) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className={`block px-4 py-3 hover:bg-white/5 ${idx === 0 ? '' : 'border-t border-white/10'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-50">{p.name}</div>
                    <span className="font-mono text-xs text-slate-200/50">/{p.slug}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-200/60">{p.summary}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="brand">{p.visibility}</Tag>
                  {p.tags.slice(0, 2).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                  {p.tags.length > 2 ? <span className="text-[11px] text-slate-200/50">+{p.tags.length - 2}</span> : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

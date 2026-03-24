'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tag } from '@/components/Card';
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
              <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10" href="/demo">
                Live Demo
              </Link>
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
            <input
              className="w-[320px] max-w-[85vw] rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="slug / name / summary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-200/60">{projects.length} projects</div>
            <button type="submit" className="rounded-xl bg-sky-400/20 px-3 py-2 text-xs text-sky-100 hover:bg-sky-400/25">
              Apply
            </button>
            {query.trim() ? (
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
                onClick={() => router.push('/projects')}
              >
                Clear
              </button>
            ) : null}
          </div>
        </form>

        <div className="grid gap-2">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-50">{p.name}</div>
                    <span className="font-mono text-xs text-slate-200/50">/{p.slug}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-200/70">{p.summary}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="brand">{p.visibility}</Tag>
                  <span className="text-[11px] text-slate-200/60">files {p.files.length}</span>
                </div>
              </div>

              {p.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.tags.slice(0, 6).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                  {p.tags.length > 6 ? <span className="text-[11px] text-slate-200/50">+{p.tags.length - 6}</span> : null}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

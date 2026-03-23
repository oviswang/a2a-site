'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

export function ProjectsClient() {
  const { state } = useWorkspace();
  const sp = useSearchParams();
  const q = (sp.get('q') || '').trim().toLowerCase();
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

        <div className="grid gap-4">
          {projects.map((p) => (
            <Card
              key={p.slug}
              title={p.name}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Tag tone="brand">{p.visibility}</Tag>
                    {p.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                  <span className="text-xs">Files: {p.files.length}</span>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <p>{p.summary}</p>
                <Link className="text-sm font-medium underline decoration-white/30 hover:decoration-white/60" href={`/projects/${p.slug}`}>
                  Open workspace
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

'use client';

import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

export default function ProjectsPage() {
  const { state } = useWorkspace();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Explore Projects"
          subtitle="In-memory workspace list (prototype)."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Projects' }]} />}
          actions={
            <Link className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800" href="/projects/new">
              Create Project
            </Link>
          }
        />

        <div className="grid gap-4">
          {state.projects.map((p) => (
            <Card
              key={p.slug}
              title={p.name}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Tag>{p.visibility}</Tag>
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
                <Link className="text-sm font-medium text-slate-900 underline" href={`/projects/${p.slug}`}>
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

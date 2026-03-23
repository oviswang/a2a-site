import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { projects } from '@/lib/mock';

export default function ProjectsPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Explore Projects"
          subtitle="A mock directory of A2A-related projects."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Projects' }]} />}
        />

        <div className="grid gap-4">
          {projects.map((p) => (
            <Card
              key={p.slug}
              title={p.name}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                  <span>Updated {p.lastUpdated}</span>
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

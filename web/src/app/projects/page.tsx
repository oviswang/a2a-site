import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { projects } from '@/lib/mock';

export default function ProjectsPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Explore Projects</h1>
          <p className="mt-1 text-sm text-slate-700">Mock directory of A2A-related projects.</p>
        </div>

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
                  View details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

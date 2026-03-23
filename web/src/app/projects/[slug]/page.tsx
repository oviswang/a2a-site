import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { getProject, proposals } from '@/lib/mock';

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{p ? p.name : 'Project not found'}</h1>
            <p className="mt-1 text-sm text-slate-700">Slug: {slug}</p>
          </div>
          <Link href="/projects" className="text-sm underline">
            Back
          </Link>
        </div>

        {p ? (
          <>
            <Card
              title="Summary"
              footer={
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              }
            >
              {p.summary}
            </Card>

            <Card title="Open proposals (mock)">
              <ul className="list-disc pl-5">
                {proposals
                  .filter((x) => x.projectSlug === p.slug)
                  .map((x) => (
                    <li key={x.id}>
                      <Link className="underline" href={`/proposals/${x.id}/review`}>
                        {x.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          </>
        ) : (
          <Card title="Not found">This project slug does not exist in mock data.</Card>
        )}
      </div>
    </Layout>
  );
}

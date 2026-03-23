import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { getProject, proposals, agents } from '@/lib/mock';
import { WorkspaceShell } from './WorkspaceShell';

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={p ? p.name : 'Project not found'}
          subtitle={p ? p.summary : `Unknown slug: ${slug}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: slug }]} />}
        />

        {p ? (
          <WorkspaceShell slug={slug}>
            <Card
              title="Workspace overview"
              footer={
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <p>
                  This page is the core “project space”: overview, active proposals, and the agents/policies used to
                  review work.
                </p>
                <div className="text-xs text-slate-600">Updated {p.lastUpdated}</div>
              </div>
            </Card>

            <Card title="Active proposals" footer={<span id="proposals" className="text-xs">Section anchor: #proposals</span>}>
              <ul className="list-disc pl-5">
                {proposals
                  .filter((x) => x.projectSlug === p.slug)
                  .map((x) => (
                    <li key={x.id}>
                      <a className="underline" href={`/proposals/${x.id}/review`}>
                        {x.title}
                      </a>
                    </li>
                  ))}
                {proposals.filter((x) => x.projectSlug === p.slug).length === 0 ? <li>No proposals (mock)</li> : null}
              </ul>
            </Card>

            <Card title="Review agents (mock)" footer={<span id="agents" className="text-xs">Section anchor: #agents</span>}>
              <div className="grid gap-3 sm:grid-cols-2">
                {agents.map((a) => (
                  <div key={a.handle} className="rounded border bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{a.displayName}</div>
                      <a className="text-xs underline" href={`/agents/${a.handle}`}>@{a.handle}</a>
                    </div>
                    <div className="mt-2 text-xs text-slate-700">{a.policyHint}</div>
                  </div>
                ))}
              </div>
            </Card>
          </WorkspaceShell>
        ) : (
          <Card title="Not found">This project slug does not exist in mock data.</Card>
        )}
      </div>
    </Layout>
  );
}

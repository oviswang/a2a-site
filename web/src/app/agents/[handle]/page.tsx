import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { getAgent } from '@/lib/mock';

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const a = getAgent(handle);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={a ? a.displayName : 'Agent not found'}
          subtitle={a ? `@${a.handle}` : `Unknown handle: @${handle}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: `@${handle}` }]} />}
        />

        {a ? (
          <>
            <Card title="Bio">{a.bio}</Card>
            <Card
              title="Profile"
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>Model: {a.model}</span>
                  <div className="flex flex-wrap gap-2">
                    {a.specialties.map((s) => (
                      <Tag key={s}>{s}</Tag>
                    ))}
                  </div>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600">Policy hint</div>
                  <div className="mt-1 rounded border bg-slate-50 p-3 text-sm">{a.policyHint}</div>
                </div>
                <div className="text-xs text-slate-600">
                  This is a mock profile. Later, this page can show proven capabilities, traces, and safety constraints.
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card title="Not found">This agent handle does not exist in mock data.</Card>
        )}
      </div>
    </Layout>
  );
}

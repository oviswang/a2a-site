import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { getAgent } from '@/lib/mock';

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const a = getAgent(handle);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{a ? a.displayName : 'Agent not found'}</h1>
            <p className="mt-1 text-sm text-slate-700">@{handle}</p>
          </div>
          <Link href="/projects" className="text-sm underline">
            Explore projects
          </Link>
        </div>

        {a ? (
          <>
            <Card title="Bio">{a.bio}</Card>
            <Card
              title="Capabilities (mock)"
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

import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { getProposal, getProject, getAgent } from '@/lib/mock';

export default async function ProposalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pr = getProposal(id);
  const project = pr ? getProject(pr.projectSlug) : null;
  const author = pr ? getAgent(pr.authorHandle) : null;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Proposal Review</h1>
            <p className="mt-1 text-sm text-slate-700">ID: {id}</p>
          </div>
          <Link href="/projects" className="text-sm underline">
            Explore projects
          </Link>
        </div>

        {pr ? (
          <>
            <Card
              title={pr.title}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>Status: {pr.status}</span>
                  <div className="flex flex-wrap gap-2">
                    <Tag>{project?.slug || pr.projectSlug}</Tag>
                    <Tag>@{author?.handle || pr.authorHandle}</Tag>
                    <Tag>{pr.createdAt}</Tag>
                  </div>
                </div>
              }
            >
              <p>{pr.summary}</p>
            </Card>

            <Card title="Diff summary (mock)">
              <ul className="list-disc pl-5">
                {pr.diffSummary.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Card>

            <Card title="Risks">
              <ul className="list-disc pl-5">
                {pr.risks.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Card>

            <Card title="Actions (mock)">
              <div className="flex flex-wrap gap-3">
                <button className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500" type="button">
                  Approve
                </button>
                <button className="rounded bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-500" type="button">
                  Request changes
                </button>
                <button className="rounded border px-3 py-2 text-sm hover:bg-slate-50" type="button">
                  Comment
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-600">Actions are placeholders in this static prototype.</p>
            </Card>
          </>
        ) : (
          <Card title="Not found">This proposal ID does not exist in mock data.</Card>
        )}
      </div>
    </Layout>
  );
}

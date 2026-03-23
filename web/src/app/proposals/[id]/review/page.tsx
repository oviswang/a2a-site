import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { StatusBadge } from '@/components/Status';
import { getProposal, getProject, getAgent } from '@/lib/mock';

function DiffLine({ type, text }: { type: '+' | '-' | '~'; text: string }) {
  const cls = type === '+' ? 'text-emerald-700' : type === '-' ? 'text-rose-700' : 'text-slate-700';
  return (
    <div className={`font-mono text-xs ${cls}`}>
      <span className="mr-2">{type}</span>
      {text}
    </div>
  );
}

export default async function ProposalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pr = getProposal(id);
  const project = pr ? getProject(pr.projectSlug) : null;
  const author = pr ? getAgent(pr.authorHandle) : null;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={pr ? pr.title : 'Proposal not found'}
          subtitle={pr ? `Reviewing changes for ${project?.name || pr.projectSlug}` : `ID: ${id}`}
          breadcrumbs={
            <Breadcrumbs
              items={[
                { href: '/', label: 'Home' },
                { href: '/projects', label: 'Projects' },
                { href: project ? `/projects/${project.slug}` : undefined, label: project?.slug || pr?.projectSlug || 'project' },
                { label: pr ? pr.id : id },
              ]}
            />
          }
          actions={
            pr ? (
              <>
                <button className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500" type="button">
                  Approve
                </button>
                <button className="rounded bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-500" type="button">
                  Request changes
                </button>
              </>
            ) : null
          }
        />

        {pr ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-6">
              <Card title="Summary">
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-slate-700">{pr.summary}</div>
                  <div className="rounded border bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-600">Diff (mock)</div>
                    <div className="mt-2 flex flex-col gap-1">
                      {pr.diffSummary.map((x) => (
                        <DiffLine key={x} type="+" text={x} />
                      ))}
                      <DiffLine type="~" text="review: tighten acceptance criteria" />
                      <DiffLine type="-" text="remove stale note" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Risks">
                <ul className="list-disc pl-5">
                  {pr.risks.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </Card>

              <Card title="Discussion (mock)">
                <div className="text-xs text-slate-600">No backend yet. This will become a real comment thread.</div>
                <div className="mt-3 rounded border bg-white p-3 text-sm text-slate-700">Placeholder: leave a comment…</div>
              </Card>
            </div>

            <aside className="flex flex-col gap-4">
              <Card title="Metadata">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Status</span>
                    <StatusBadge status={pr.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Author</span>
                    <span>@{author?.handle || pr.authorHandle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Created</span>
                    <span>{pr.createdAt}</span>
                  </div>
                </div>
              </Card>

              <Card title="Checks (mock)">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Build</span>
                    <Tag>pass</Tag>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Docs consistency</span>
                    <Tag>warn</Tag>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Release signature</span>
                    <Tag>pass</Tag>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  In MVP these are placeholders; later they come from release gates.
                </div>
              </Card>
            </aside>
          </div>
        ) : (
          <Card title="Not found">This proposal ID does not exist in mock data.</Card>
        )}
      </div>
    </Layout>
  );
}

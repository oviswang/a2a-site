'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { StatusBadge } from '@/components/Status';
import { useWorkspace } from '@/lib/state';

function DiffLine({ type, text }: { type: '+' | '-' | '~'; text: string }) {
  const cls = type === '+' ? 'text-emerald-700' : type === '-' ? 'text-rose-700' : 'text-slate-700';
  return (
    <div className={`font-mono text-xs ${cls}`}>
      <span className="mr-2">{type}</span>
      {text}
    </div>
  );
}

export default function ProposalReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();

  const { state, actions } = useWorkspace();
  const pr = state.proposals.find((p) => p.id === id) || null;
  const project = pr ? state.projects.find((p) => p.slug === pr.projectSlug) : null;

  const canMerge = useMemo(() => pr && pr.status === 'approved', [pr]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={pr ? pr.title : 'Proposal not found'}
          subtitle={pr && project ? `Project: ${project.name} • File: ${pr.filePath}` : `ID: ${id}`}
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
                <button
                  className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
                  type="button"
                  onClick={() => actions.proposalAction(pr.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  className="rounded bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-500"
                  type="button"
                  onClick={() => actions.proposalAction(pr.id, 'request_changes')}
                >
                  Request changes
                </button>
                <button
                  className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                  type="button"
                  onClick={() => actions.proposalAction(pr.id, 'reject')}
                >
                  Reject
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
                      <DiffLine type="~" text={`edit ${pr.filePath}`} />
                      <DiffLine type="+" text="update headings and steps" />
                      <DiffLine type="+" text="clarify verification" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Proposed new content">
                <pre className="whitespace-pre-wrap rounded border bg-white p-4 font-mono text-xs leading-relaxed">{pr.newContent}</pre>
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
                    <span>@{pr.authorHandle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Created</span>
                    <span>{pr.createdAt}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">File</span>
                    <Tag>{pr.filePath}</Tag>
                  </div>
                </div>
              </Card>

              <Card title="Merge">
                <button
                  disabled={!canMerge}
                  className="w-full rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  type="button"
                  onClick={() => {
                    actions.proposalAction(pr.id, 'merge');
                    router.push(`/projects/${pr.projectSlug}?file=${encodeURIComponent(pr.filePath)}`);
                  }}
                >
                  Merge into workspace
                </button>
                <div className="mt-2 text-xs text-slate-600">
                  Merge is enabled only after approval. Changes apply to project file content in memory.
                </div>
              </Card>
            </aside>
          </div>
        ) : (
          <Card title="Not found">This proposal ID does not exist in state.</Card>
        )}
      </div>
    </Layout>
  );
}

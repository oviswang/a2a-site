'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { WorkspaceShell } from './WorkspaceShell';
import { useWorkspace } from '@/lib/state';

function splitDirs(paths: string[]) {
  const out: Record<string, string[]> = {};
  for (const p of paths) {
    const parts = p.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    out[dir] = out[dir] || [];
    out[dir].push(p);
  }
  for (const k of Object.keys(out)) out[k].sort();
  return out;
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const router = useRouter();
  const sp = useSearchParams();
  const selected = sp.get('file') || 'README.md';

  const { state, actions } = useWorkspace();
  const project = state.projects.find((p) => p.slug === slug) || null;

  useEffect(() => {
    actions.loadProject(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const files = project?.files || [];
  const filePaths = files.map((f) => f.path);
  const tree = splitDirs(filePaths);
  const selectedFile = files.find((f) => f.path === selected) || files[0] || null;
  const proposals = state.proposalsByProject[slug] || [];

  const actor = state.actor;
  const myMember = project?.members?.find((m) => m.handle === actor.handle) || null;
  const isOwnerOrMaintainer = myMember ? myMember.role === 'owner' || myMember.role === 'maintainer' : false;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={project ? project.name : 'Project'}
          subtitle={project ? project.summary : `Loading: ${slug}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: slug }]} />}
          actions={
            project ? (
              <div className="flex flex-wrap gap-2">
                {!myMember ? (
                  <button
                    type="button"
                    className={`rounded px-3 py-2 text-sm text-white ${project.visibility === 'restricted' ? 'bg-amber-700 hover:bg-amber-600' : 'bg-emerald-700 hover:bg-emerald-600'}`}
                    onClick={() => {
                      actions.joinProject(slug).catch(() => void 0);
                    }}
                  >
                    {project.visibility === 'restricted' ? 'Request access' : 'Join project'}
                  </button>
                ) : (
                  <div className="rounded border px-3 py-2 text-sm">Member: @{myMember.handle} ({myMember.role})</div>
                )}

                <button
                  type="button"
                  className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                  onClick={() => {
                    const fp = selectedFile?.path || 'README.md';
                    router.push(`/projects/${slug}/proposals/new?file=${encodeURIComponent(fp)}`);
                  }}
                >
                  Create Proposal
                </button>
              </div>
            ) : null
          }
        />

        {project ? (
          <WorkspaceShell slug={slug}>
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-600">Files</div>
                <div className="mt-3 flex flex-col gap-3 text-sm">
                  {Object.keys(tree)
                    .sort()
                    .map((dir) => (
                      <div key={dir || '__root'}>
                        <div className="text-xs font-semibold text-slate-500">{dir || '(root)'}</div>
                        <div className="mt-2 flex flex-col gap-1">
                          {tree[dir].map((p) => {
                            const isSel = p === selectedFile?.path;
                            return (
                              <Link
                                key={p}
                                className={`rounded px-2 py-1 font-mono text-xs hover:bg-slate-50 ${isSel ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                href={`/projects/${slug}?file=${encodeURIComponent(p)}`}
                              >
                                {p}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </aside>

              <div className="flex flex-col gap-6">
                <Card
                  title={selectedFile ? selectedFile.path : 'No file selected'}
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        Updated {selectedFile?.updatedAt || '—'}
                        {selectedFile?.lastActorHandle ? (
                          <span className="ml-2 text-xs text-slate-600">
                            by @{selectedFile.lastActorHandle} ({selectedFile.lastActorType || '—'})
                          </span>
                        ) : null}
                        {selectedFile?.lastProposalId ? (
                          <span className="ml-2 text-xs">
                            via{' '}
                            <Link className="underline" href={`/proposals/${encodeURIComponent(selectedFile.lastProposalId)}/review`}>
                              {selectedFile.lastProposalId}
                            </Link>
                          </span>
                        ) : null}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Tag>markdown</Tag>
                        <Tag>{project.visibility}</Tag>
                      </div>
                    </div>
                  }
                >
                  <pre className="whitespace-pre-wrap rounded border bg-slate-50 p-4 text-xs leading-relaxed">
                    {selectedFile?.content || '—'}
                  </pre>
                </Card>

                <Card title="Proposal timeline">
                  <div className="flex flex-col gap-3">
                    {proposals.map((p) => (
                      <div key={p.id} className="rounded border bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link className="text-sm font-medium underline" href={`/proposals/${p.id}/review`}>
                            {p.title}
                          </Link>
                          <span className="text-xs text-slate-600">
                            {p.createdAt} · {p.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Opened by @{p.authorHandle} ({p.authorType}) · file <span className="font-mono">{p.filePath}</span>
                        </div>
                        {p.lastReview ? (
                          <div className="mt-2 text-xs">
                            Last review: {p.lastReview.action} by @{p.lastReview.actorHandle || 'unknown'} ({p.lastReview.actorType || '—'}) ·{' '}
                            {String(p.lastReview.createdAt).slice(0, 19).replace('T', ' ')}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-slate-500">No review events yet</div>
                        )}
                      </div>
                    ))}
                    {proposals.length === 0 ? <div className="text-sm text-slate-600">No proposals</div> : null}
                  </div>
                </Card>

                <Card title="Decisions">
                  <div className="text-xs text-slate-600">First-class artifact: DECISIONS.md</div>
                  <div className="mt-3 rounded border bg-slate-50 p-3 text-xs">
                    {(files.find((f) => f.path === 'DECISIONS.md')?.content || '(no DECISIONS.md)')
                      .split('\n')
                      .slice(0, 6)
                      .join('\n')}
                  </div>
                  <div className="mt-3">
                    <Link className="text-sm underline" href={`/projects/${slug}?file=${encodeURIComponent('DECISIONS.md')}`}>
                      Open DECISIONS.md
                    </Link>
                  </div>
                </Card>

                <Card title="Members">
                  <div className="text-xs text-slate-600">Join mode: {project.visibility}</div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-600">Humans</div>
                      <ul className="mt-2 list-disc pl-5">
                        {(project.members || [])
                          .filter((m) => m.memberType === 'human')
                          .map((m) => (
                            <li key={m.handle}>
                              @{m.handle} · {m.role}
                            </li>
                          ))}
                        {(project.members || []).filter((m) => m.memberType === 'human').length === 0 ? <li>None</li> : null}
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600">Agents</div>
                      <div className="mt-2 flex flex-col gap-2">
                        {(project.members || [])
                          .filter((m) => m.memberType === 'agent')
                          .map((m) => (
                            <div key={m.handle} className="rounded border bg-slate-50 p-3">
                              <div className="flex items-center justify-between">
                                <Link className="font-mono text-xs underline" href={`/agents/${encodeURIComponent(m.handle)}`}>
                                  @{m.handle}
                                </Link>
                                <span className="text-xs text-slate-600">{m.role}</span>
                              </div>
                              <div className="mt-2 text-xs text-slate-600">Local agent presence (no external binding yet).</div>
                            </div>
                          ))}
                        {(project.members || []).filter((m) => m.memberType === 'agent').length === 0 ? (
                          <div className="text-xs text-slate-600">None</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>

                {isOwnerOrMaintainer ? (
                  <Card title="Join requests">
                    <ul className="list-disc pl-5">
                      {(project.joinRequests || []).map((r) => (
                        <li key={r.id}>
                          @{r.handle} ({r.memberType}) — {r.status}
                          {r.status === 'pending' ? (
                            <span className="ml-2 inline-flex gap-2">
                              <button
                                className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
                                type="button"
                                onClick={() => actions.reviewJoinRequest(r.id, 'approve').then(() => actions.loadProject(slug))}
                              >
                                Approve
                              </button>
                              <button
                                className="rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500"
                                type="button"
                                onClick={() => actions.reviewJoinRequest(r.id, 'reject').then(() => actions.loadProject(slug))}
                              >
                                Reject
                              </button>
                            </span>
                          ) : null}
                        </li>
                      ))}
                      {(project.joinRequests || []).length === 0 ? <li>No join requests</li> : null}
                    </ul>
                  </Card>
                ) : null}

                <Card title="Workspace timeline">
                  <ul className="list-disc pl-5">
                    {(project.activity || []).slice(0, 8).map((a, idx) => (
                      <li key={idx}>
                        <span className="text-xs text-slate-500">{a.ts.slice(0, 19).replace('T', ' ')} </span>
                        {a.text}
                      </li>
                    ))}
                    {(project.activity || []).length === 0 ? <li>No activity</li> : null}
                  </ul>
                </Card>
              </div>
            </div>
          </WorkspaceShell>
        ) : (
          <Card title="Loading">Fetching project from local DB…</Card>
        )}
      </div>
    </Layout>
  );
}

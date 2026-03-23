'use client';

import { useEffect, useState } from 'react';
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
  const tasks = state.tasksByProject[slug] || [];

  const tasksGrouped = {
    open: tasks.filter((t) => t.status === 'open'),
    claimed: tasks.filter((t) => t.status === 'claimed'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  const actor = state.actor;
  const myMember = project?.members?.find((m) => m.handle === actor.handle) || null;
  const isOwnerOrMaintainer = myMember ? myMember.role === 'owner' || myMember.role === 'maintainer' : false;

  const identityByHandle = new Map(state.identities.map((i) => [i.handle, i] as const));

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

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
                <Card title="Workspace status">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded border bg-slate-50 p-3">
                      <div className="text-xs text-slate-600">Tasks</div>
                      <div className="text-lg font-semibold">{tasks.length}</div>
                      <div className="text-xs text-slate-600">open {tasksGrouped.open.length} · in progress {tasksGrouped.in_progress.length}</div>
                    </div>
                    <div className="rounded border bg-slate-50 p-3">
                      <div className="text-xs text-slate-600">Proposals</div>
                      <div className="text-lg font-semibold">{proposals.length}</div>
                      <div className="text-xs text-slate-600">needs review {proposals.filter((p) => p.status === 'needs_review').length}</div>
                    </div>
                    <div className="rounded border bg-slate-50 p-3">
                      <div className="text-xs text-slate-600">Members</div>
                      <div className="text-lg font-semibold">{project.members?.length || 0}</div>
                      <div className="text-xs text-slate-600">humans {(project.members || []).filter((m) => m.memberType === 'human').length} · agents {(project.members || []).filter((m) => m.memberType === 'agent').length}</div>
                    </div>
                    <div className="rounded border bg-slate-50 p-3">
                      <div className="text-xs text-slate-600">You</div>
                      <div className="text-sm font-mono">@{actor.handle}</div>
                      <div className="text-xs text-slate-600">{actor.actorType}</div>
                    </div>
                  </div>
                </Card>
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

                <Card title="How this collaboration loop works">
                  <ol className="list-decimal pl-5 text-sm text-slate-700">
                    <li>Create a task (human or agent) and attach a file context.</li>
                    <li>Claim/start work, then create a proposal from the task.</li>
                    <li>Review + merge the proposal to update files.</li>
                    <li>Merge auto-completes the linked task and records history.</li>
                  </ol>
                  <div className="mt-2 text-xs text-slate-600">No auth, no automation: everything is local + explicit for now.</div>
                </Card>

                <Card title="Tasks">
                  <div className="text-xs text-slate-600">A shared collaboration queue (human + agent). No automation yet.</div>

                  <div className="mt-3 grid gap-2 rounded border bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">Create task</div>
                    <input
                      className="rounded border px-3 py-2 text-sm"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Update quickstart steps"
                    />
                    <textarea
                      className="rounded border px-3 py-2 text-sm"
                      rows={3}
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Optional context for human/agent"
                    />
                    <button
                      type="button"
                      className="w-fit rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                      onClick={async () => {
                        if (!taskTitle.trim()) return;
                        await actions.createTask({ projectSlug: slug, title: taskTitle, description: taskDesc, filePath: selectedFile?.path || null });
                        setTaskTitle('');
                        setTaskDesc('');
                        await actions.loadProject(slug);
                      }}
                    >
                      Add task
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {([
                      ['open', tasksGrouped.open],
                      ['claimed', tasksGrouped.claimed],
                      ['in_progress', tasksGrouped.in_progress],
                      ['completed', tasksGrouped.completed],
                    ] as const).map(([label, list]) => (
                      <div key={label}>
                        <div className="mb-2 text-xs font-semibold text-slate-600">
                          {label} <span className="text-slate-400">({list.length})</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {list.map((t) => (
                            <div key={t.id} className="rounded border bg-white p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-medium">
                                  <Link className="underline" href={`/tasks/${t.id}`}>
                                    {t.title}
                                  </Link>{' '}
                                  <span className="ml-2 font-mono text-xs text-slate-500">{t.id}</span>
                                </div>
                                <div className="text-xs text-slate-600">{t.status}</div>
                              </div>
                              {t.description ? <div className="mt-1 text-sm text-slate-700">{t.description}</div> : null}
                              <div className="mt-2 text-xs text-slate-600">
                                {t.claimedByHandle ? (
                                  <span>
                                    Claimed by @{t.claimedByHandle} ({t.claimedByType || '—'})
                                  </span>
                                ) : (
                                  <span>Unclaimed</span>
                                )}
                                {t.filePath ? (
                                  <span className="ml-2">
                                    · file{' '}
                                    <Link className="font-mono underline" href={`/projects/${slug}?file=${encodeURIComponent(t.filePath)}`}>
                                      {t.filePath}
                                    </Link>
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                  type="button"
                                  onClick={async () => {
                                    await actions.taskAction(t.id, t.claimedByHandle ? 'unclaim' : 'claim');
                                    await actions.loadProject(slug);
                                  }}
                                >
                                  {t.claimedByHandle ? 'Unclaim' : 'Claim'}
                                </button>
                                <button
                                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                  type="button"
                                  onClick={async () => {
                                    await actions.taskAction(t.id, 'start');
                                    await actions.loadProject(slug);
                                  }}
                                >
                                  Start
                                </button>
                                <button
                                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                  type="button"
                                  onClick={async () => {
                                    await actions.taskAction(t.id, 'complete');
                                    await actions.loadProject(slug);
                                  }}
                                >
                                  Complete
                                </button>

                                <Link
                                  className="rounded bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-600"
                                  href={`/projects/${slug}/proposals/new?file=${encodeURIComponent(t.filePath || selectedFile?.path || 'README.md')}&taskId=${encodeURIComponent(t.id)}`}
                                >
                                  Propose from task
                                </Link>
                              </div>
                            </div>
                          ))}
                          {list.length === 0 ? <div className="text-sm text-slate-600">None</div> : null}
                        </div>
                      </div>
                    ))}

                    {tasks.length === 0 ? <div className="text-sm text-slate-600">No tasks yet</div> : null}
                  </div>
                </Card>

                <Card title="Join as Agent (external)">
                  <div className="text-xs text-slate-600">Copy/paste intake instructions (no automation; identity + join/request only).</div>
                  <pre className="mt-3 whitespace-pre-wrap rounded border bg-slate-50 p-3 text-xs">{`curl -X POST https://site.a2a.fun/api/intake/agent \\
  -H 'content-type: application/json' \\
  -d '{
    "agentHandle": "my_agent",
    "displayName": "My External Agent",
    "projectSlug": "${slug}",
    "runtime": { "platform": "openclaw", "capabilities": ["propose", "review"], "version": "0.0" }
  }'`}</pre>
                  <div className="mt-2 text-xs text-slate-600">
                    Open projects join immediately; restricted projects create a join request for the owner/maintainer to review.
                  </div>
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
                          Opened by @{p.authorHandle} ({p.authorType})
                          {identityByHandle.get(p.authorHandle)?.displayName ? (
                            <span className="text-slate-500"> — {identityByHandle.get(p.authorHandle)?.displayName}</span>
                          ) : null}
                          · file <span className="font-mono">{p.filePath}</span>
                          {p.taskId ? (
                            <>
                              {' '}
                              · task{' '}
                              <Link className="font-mono underline" href={`/tasks/${encodeURIComponent(p.taskId)}`}>
                                {p.taskId}
                              </Link>
                            </>
                          ) : null}
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
                              @{m.handle}
                              {identityByHandle.get(m.handle)?.displayName ? (
                                <span className="text-slate-500"> — {identityByHandle.get(m.handle)?.displayName}</span>
                              ) : null}
                              <span className="text-slate-500"> · {m.role}</span>
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
                              <div className="mt-2 text-xs text-slate-600">
                                {identityByHandle.get(m.handle)?.displayName ? (
                                  <div>{identityByHandle.get(m.handle)?.displayName}</div>
                                ) : null}
                                <div>
                                  claim: {identityByHandle.get(m.handle)?.claimState || '—'}
                                  {identityByHandle.get(m.handle)?.ownerHandle ? ` · owner @${identityByHandle.get(m.handle)?.ownerHandle}` : ''}
                                </div>
                              </div>
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

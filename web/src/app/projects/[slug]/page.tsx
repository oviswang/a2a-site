'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
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
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [reqRoles, setReqRoles] = useState<Record<string, 'contributor' | 'maintainer'>>({});

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={project ? project.name : 'Project'}
          subtitle={project ? `${project.summary} · ${project.visibility}` : `Loading: ${slug}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: slug }]} />}
          actions={
            project ? (
              <div className="flex flex-wrap gap-2">
                {!myMember ? (
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-sm text-white ${project.visibility === 'restricted' ? 'bg-amber-700 hover:bg-amber-600' : 'bg-emerald-700 hover:bg-emerald-600'}`}
                    onClick={async () => {
                      const r = await actions.joinProject(slug);
                      if (!r) return;
                      if (r.mode === 'joined') setJoinMsg('Joined the project.');
                      else if (r.mode === 'requested') setJoinMsg('Access requested. Waiting for owner/maintainer review.');
                      else if (r.mode === 'already_member') setJoinMsg('You are already a member.');
                      await actions.loadProject(slug);
                    }}
                  >
                    {project.visibility === 'restricted' ? 'Request access' : 'Join'}
                  </button>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    @{myMember.handle} · {myMember.role}
                  </div>
                )}
                <button
                  type="button"
                  className="rounded-xl bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25"
                  onClick={() => {
                    const fp = selectedFile?.path || 'README.md';
                    router.push(`/projects/${slug}/proposals/new?file=${encodeURIComponent(fp)}`);
                  }}
                >
                  New proposal
                </button>
              </div>
            ) : null
          }
        />

        {project ? (
          <WorkspaceShell slug={slug}>
            {/* OVERVIEW */}
            <section id="overview" className="scroll-mt-24">
              <Card title="Overview">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">Tasks</div>
                    <div className="text-lg font-semibold text-slate-50">{tasks.length}</div>
                    <div className="text-xs text-slate-200/60">open {tasksGrouped.open.length} · in progress {tasksGrouped.in_progress.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">Proposals</div>
                    <div className="text-lg font-semibold text-slate-50">{proposals.length}</div>
                    <div className="text-xs text-slate-200/60">needs review {proposals.filter((p) => p.status === 'needs_review').length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">Members</div>
                    <div className="text-lg font-semibold text-slate-50">{project.members?.length || 0}</div>
                    <div className="text-xs text-slate-200/60">
                      humans {(project.members || []).filter((m) => m.memberType === 'human').length} · agents {(project.members || []).filter((m) => m.memberType === 'agent').length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">You</div>
                    <div className="text-sm font-mono text-slate-50">@{actor.handle}</div>
                    <div className="text-xs text-slate-200/60">{actor.actorType}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/80">
                  <span>
                    Join mode: <span className="font-semibold">{project.visibility}</span>
                  </span>
                  {joinMsg ? <span className="text-sky-200">{joinMsg}</span> : <span className="text-slate-200/50">—</span>}
                </div>
              </Card>
            </section>

            {/* TASKS */}
            <section id="tasks" className="scroll-mt-24">
              <Card title="Tasks">
                <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs font-semibold text-slate-200/70">Create task</div>
                  <input
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task title"
                  />
                  <textarea
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    rows={3}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Optional description"
                  />
                  <button
                    type="button"
                    className="w-fit rounded-2xl bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25"
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
                      <div className="mb-2 text-xs font-semibold text-slate-200/70">
                        {label} <span className="text-slate-200/30">({list.length})</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {list.map((t) => (
                          <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-medium text-slate-50">
                                <Link className="underline decoration-white/30 hover:decoration-white/60" href={`/tasks/${t.id}`}>
                                  {t.title}
                                </Link>{' '}
                                <span className="ml-2 font-mono text-xs text-slate-200/40">{t.id}</span>
                              </div>
                              <div className="text-xs text-slate-200/60">{t.status}</div>
                            </div>
                            {t.description ? <div className="mt-1 text-sm text-slate-200/80">{t.description}</div> : null}
                            <div className="mt-2 text-xs text-slate-200/60">
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
                                  <Link className="font-mono underline decoration-white/30 hover:decoration-white/60" href={`/projects/${slug}?file=${encodeURIComponent(t.filePath)}`}>
                                    {t.filePath}
                                  </Link>
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                                type="button"
                                onClick={async () => {
                                  await actions.taskAction(t.id, t.claimedByHandle ? 'unclaim' : 'claim');
                                  await actions.loadProject(slug);
                                }}
                              >
                                {t.claimedByHandle ? 'Unclaim' : 'Claim'}
                              </button>
                              <button
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                                type="button"
                                onClick={async () => {
                                  await actions.taskAction(t.id, 'start');
                                  await actions.loadProject(slug);
                                }}
                              >
                                Start
                              </button>
                              <button
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                                type="button"
                                onClick={async () => {
                                  await actions.taskAction(t.id, 'complete');
                                  await actions.loadProject(slug);
                                }}
                              >
                                Complete
                              </button>

                              <Link
                                className="rounded-xl bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-600"
                                href={`/projects/${slug}/proposals/new?file=${encodeURIComponent(t.filePath || selectedFile?.path || 'README.md')}&taskId=${encodeURIComponent(t.id)}`}
                              >
                                Propose
                              </Link>
                            </div>
                          </div>
                        ))}
                        {list.length === 0 ? <div className="text-sm text-slate-200/60">None</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* PROPOSALS */}
            <section id="proposals" className="scroll-mt-24">
              <Card title="Proposals">
                <div className="flex flex-col gap-3">
                  {proposals.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link className="text-sm font-medium underline decoration-white/30 hover:decoration-white/60" href={`/proposals/${p.id}/review`}>
                          {p.title}
                        </Link>
                        <span className="text-xs text-slate-200/60">
                          {p.createdAt} · {p.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-200/60">
                        @{p.authorHandle} ({p.authorType})
                        {identityByHandle.get(p.authorHandle)?.displayName ? (
                          <span className="text-slate-200/40"> — {identityByHandle.get(p.authorHandle)?.displayName}</span>
                        ) : null}
                        {' '}· file <span className="font-mono">{p.filePath}</span>
                        {p.taskId ? (
                          <>
                            {' '}· task{' '}
                            <Link className="font-mono underline decoration-white/30 hover:decoration-white/60" href={`/tasks/${encodeURIComponent(p.taskId)}`}>
                              {p.taskId}
                            </Link>
                          </>
                        ) : null}
                      </div>
                      {p.lastReview ? (
                        <div className="mt-2 text-xs text-slate-200/70">
                          Last review: {p.lastReview.action} by @{p.lastReview.actorHandle || 'unknown'} ({p.lastReview.actorType || '—'}) ·{' '}
                          {String(p.lastReview.createdAt).slice(0, 19).replace('T', ' ')}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-200/40">No review events yet</div>
                      )}
                    </div>
                  ))}
                  {proposals.length === 0 ? <div className="text-sm text-slate-200/60">No proposals</div> : null}
                </div>
              </Card>
            </section>

            {/* FILES */}
            <section id="files" className="scroll-mt-24">
              <Card title="Files">
                <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                  <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="text-xs font-semibold text-slate-200/70">File tree</div>
                    <div className="mt-3 flex flex-col gap-3 text-sm">
                      {Object.keys(tree)
                        .sort()
                        .map((dir) => (
                          <div key={dir || '__root'}>
                            <div className="text-xs font-semibold text-slate-200/50">{dir || '(root)'}</div>
                            <div className="mt-2 flex flex-col gap-1">
                              {tree[dir].map((p) => {
                                const isSel = p === selectedFile?.path;
                                return (
                                  <Link
                                    key={p}
                                    className={`rounded-xl px-2 py-1 font-mono text-xs hover:bg-white/5 ${isSel ? 'bg-white/10 text-slate-50' : 'text-slate-200/70'}`}
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

                  <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="font-mono text-xs text-slate-50">{selectedFile ? selectedFile.path : '—'}</div>
                        <div className="text-xs text-slate-200/60">
                          updated {selectedFile?.updatedAt || '—'}
                          {selectedFile?.lastActorHandle ? (
                            <span className="ml-2">
                              by @{selectedFile.lastActorHandle} ({selectedFile.lastActorType || '—'})
                            </span>
                          ) : null}
                          {selectedFile?.lastProposalId ? (
                            <span className="ml-2">
                              via{' '}
                              <Link className="underline decoration-white/30 hover:decoration-white/60" href={`/proposals/${encodeURIComponent(selectedFile.lastProposalId)}/review`}>
                                {selectedFile.lastProposalId}
                              </Link>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-slate-100">
                        {selectedFile?.content || '—'}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* DECISIONS */}
            <section id="decisions" className="scroll-mt-24">
              <Card title="Decisions">
                <div className="text-xs text-slate-200/60">First-class artifact: DECISIONS.md</div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-100">
                  {(files.find((f) => f.path === 'DECISIONS.md')?.content || '(no DECISIONS.md)')
                    .split('\n')
                    .slice(0, 10)
                    .join('\n')}
                </div>
                <div className="mt-3">
                  <Link className="text-sm underline decoration-white/30 hover:decoration-white/60" href={`/projects/${slug}?file=${encodeURIComponent('DECISIONS.md')}`}>
                    Open DECISIONS.md
                  </Link>
                </div>
              </Card>
            </section>

            {/* PEOPLE */}
            <section id="people" className="scroll-mt-24">
              <Card title="People">
                <div className="text-xs text-slate-200/60">Join mode: {project.visibility}</div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">Humans</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-200/80">
                      {(project.members || [])
                        .filter((m) => m.memberType === 'human')
                        .map((m) => (
                          <li key={m.handle}>
                            @{m.handle}
                            {identityByHandle.get(m.handle)?.displayName ? (
                              <span className="text-slate-200/40"> — {identityByHandle.get(m.handle)?.displayName}</span>
                            ) : null}
                            <span className="text-slate-200/40"> · {m.role}</span>
                          </li>
                        ))}
                      {(project.members || []).filter((m) => m.memberType === 'human').length === 0 ? <li>None</li> : null}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">Agents</div>
                    <div className="mt-2 flex flex-col gap-2">
                      {(project.members || [])
                        .filter((m) => m.memberType === 'agent')
                        .map((m) => (
                          <div key={m.handle} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                              <Link className="font-mono text-xs underline decoration-white/30 hover:decoration-white/60" href={`/agents/${encodeURIComponent(m.handle)}`}>
                                @{m.handle}
                              </Link>
                              <span className="text-xs text-slate-200/60">{m.role}</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-200/60">
                              {identityByHandle.get(m.handle)?.displayName ? <div>{identityByHandle.get(m.handle)?.displayName}</div> : null}
                              <div>
                                claim: {identityByHandle.get(m.handle)?.claimState || '—'}
                                {identityByHandle.get(m.handle)?.ownerHandle ? ` · owner @${identityByHandle.get(m.handle)?.ownerHandle}` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      {(project.members || []).filter((m) => m.memberType === 'agent').length === 0 ? (
                        <div className="text-sm text-slate-200/60">None</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {isOwnerOrMaintainer ? (
                  <div className="mt-6">
                    <div className="text-xs font-semibold text-slate-200/70">Join requests</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-200/80">
                      {(project.joinRequests || []).map((r) => (
                        <li key={r.id}>
                          @{r.handle} ({r.memberType}) — {r.status}
                          {r.status === 'pending' ? (
                            <span className="ml-2 inline-flex flex-wrap items-center gap-2">
                              <select
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                                value={reqRoles[r.id] || 'contributor'}
                                onChange={(e) =>
                                  setReqRoles((s) => ({
                                    ...s,
                                    [r.id]: e.target.value === 'maintainer' ? 'maintainer' : 'contributor',
                                  }))
                                }
                              >
                                <option value="contributor">contributor</option>
                                <option value="maintainer">maintainer</option>
                              </select>
                              <button
                                className="rounded-xl bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-600"
                                type="button"
                                onClick={() =>
                                  actions.reviewJoinRequest(r.id, 'approve', reqRoles[r.id] || 'contributor').then(() => actions.loadProject(slug))
                                }
                              >
                                Approve
                              </button>
                              <button
                                className="rounded-xl bg-rose-700 px-2 py-1 text-xs text-white hover:bg-rose-600"
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
                  </div>
                ) : null}
              </Card>

              <div id="join-agent" className="scroll-mt-24">
                <Card title="Join as Agent (external)">
                  <div className="text-xs text-slate-200/60">Copy/paste intake instructions (no automation; identity + join/request only).</div>
                  <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-100">{`curl -X POST https://site.a2a.fun/api/intake/agent \\
  -H 'content-type: application/json' \\
  -d '{
    "agentHandle": "my_agent",
    "displayName": "My External Agent",
    "projectSlug": "${slug}",
    "runtime": { "platform": "openclaw", "capabilities": ["tasks", "propose", "review"], "version": "0.0" }
  }'`}</pre>
                  <div className="mt-2 text-xs text-slate-200/60">
                    Open projects join immediately; restricted projects create a join request for the owner/maintainer to review.
                  </div>
                </Card>
              </div>
            </section>

            {/* TIMELINE */}
            <section id="timeline" className="scroll-mt-24">
              <Card title="Timeline">
                <ul className="list-disc pl-5 text-sm text-slate-200/80">
                  {project.activity.slice(0, 12).map((a, idx) => (
                    <li key={idx}>
                      <span className="text-xs text-slate-200/40">{a.ts.slice(0, 19).replace('T', ' ')} </span>
                      {a.text}
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          </WorkspaceShell>
        ) : (
          <Card title="Not found">This project slug does not exist in state.</Card>
        )}
      </div>
    </Layout>
  );
}

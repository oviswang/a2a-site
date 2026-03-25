'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { WorkspaceShell } from './WorkspaceShell';
import { Toast } from '@/components/Toast';
import { Toolbar, ToolbarGroup, ToolbarLabel } from '@/components/Toolbar';
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

  const [toast, setToast] = useState<{ message: string; variant?: 'info' | 'success' | 'error' } | null>(null);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [joinMsg, setJoinMsg] = useState<string | null>(null);

  // Operational filters/sorts (client-side)
  const [taskQuery, setTaskQuery] = useState('');
  const [taskStatus, setTaskStatus] = useState<'all' | 'open' | 'claimed' | 'in_progress' | 'completed' | 'unclaimed'>('all');
  const [taskMine, setTaskMine] = useState(false);
  const [taskSort, setTaskSort] = useState<'updated_desc' | 'created_desc' | 'title_asc'>('updated_desc');

  const [proposalQuery, setProposalQuery] = useState('');
  const [proposalStatus, setProposalStatus] = useState<'all' | 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged'>('all');
  const [proposalMine, setProposalMine] = useState(false);
  const [proposalSort, setProposalSort] = useState<'created_desc' | 'status_then_created' | 'title_asc'>('status_then_created');

  const [peopleQuery, setPeopleQuery] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const [timelineQuery, setTimelineQuery] = useState('');
  const [timelineKindFilter, setTimelineKindFilter] = useState<'all' | 'task' | 'proposal' | 'review' | 'merge' | 'invite' | 'member' | 'access' | 'event'>('all');

  // Dense-page defaults: summary-first + collapse long blocks
  const [showActiveDetails, setShowActiveDetails] = useState(false);
  const [showProposalMeta, setShowProposalMeta] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [showMemberOps, setShowMemberOps] = useState(false);

  useEffect(() => {
    // Mobile-first: collapse long sections by default.
    setExpandTasks(false);
    setExpandProposals(false);
    setExpandFiles(false);
    setExpandPeople(false);
    setExpandTimeline(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const [expandTasks, setExpandTasks] = useState(false);
  const [expandProposals, setExpandProposals] = useState(false);
  const [expandFiles, setExpandFiles] = useState(false);
  const [expandPeople, setExpandPeople] = useState(false);
  const [expandTimeline, setExpandTimeline] = useState(false);

  const [reqRoles, setReqRoles] = useState<Record<string, 'contributor' | 'maintainer'>>({});
  const [inviteHandle, setInviteHandle] = useState('');
  const [inviteType, setInviteType] = useState<'human' | 'agent'>('agent');
  const [inviteRole, setInviteRole] = useState<'contributor' | 'maintainer'>('contributor');
  const [peopleMsg, setPeopleMsg] = useState<string | null>(null);

  const files = project?.files || [];
  const filePaths = files.map((f) => f.path);
  const tree = splitDirs(filePaths);
  const selectedFile = files.find((f) => f.path === selected) || files[0] || null;

  const proposals = state.proposalsByProject[slug] || [];
  const tasks = state.tasksByProject[slug] || [];

  const actor = state.actor;

  const tasksGrouped = {
    open: tasks.filter((t) => t.status === 'open'),
    claimed: tasks.filter((t) => t.status === 'claimed'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  const taskMatches = (t: (typeof tasks)[number]) => {
    const q = taskQuery.trim().toLowerCase();
    if (q) {
      const hay = `${t.title}\n${t.description || ''}\n${t.id}\n${t.filePath || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (taskMine && t.claimedByHandle !== actor.handle) return false;
    if (taskStatus === 'all') return true;
    if (taskStatus === 'unclaimed') return !t.claimedByHandle && t.status === 'open';
    return t.status === taskStatus;
  };

  const sortedTasks = [...tasks].filter(taskMatches).sort((a, b) => {
    if (taskSort === 'title_asc') return String(a.title).localeCompare(String(b.title));
    if (taskSort === 'created_desc') return String(b.createdAt).localeCompare(String(a.createdAt));
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });

  const statusRank: Record<string, number> = {
    needs_review: 0,
    changes_requested: 1,
    approved: 2,
    merged: 3,
    rejected: 4,
  };

  const proposalMatches = (p: (typeof proposals)[number]) => {
    const q = proposalQuery.trim().toLowerCase();
    if (q) {
      const hay = `${p.title}\n${p.id}\n${p.filePath}\n${p.authorHandle}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (proposalMine && p.authorHandle !== actor.handle) return false;
    if (proposalStatus === 'all') return true;
    return p.status === proposalStatus;
  };

  const sortedProposals = [...proposals].filter(proposalMatches).sort((a, b) => {
    if (proposalSort === 'title_asc') return String(a.title).localeCompare(String(b.title));
    if (proposalSort === 'created_desc') return String(b.createdAt).localeCompare(String(a.createdAt));
    const ra = statusRank[a.status] ?? 99;
    const rb = statusRank[b.status] ?? 99;
    if (ra !== rb) return ra - rb;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  const myMember = project?.members?.find((m) => m.handle === actor.handle) || null;
  const isOwnerOrMaintainer = myMember ? myMember.role === 'owner' || myMember.role === 'maintainer' : false;
  const identityByHandle = new Map(state.identities.map((i) => [i.handle, i] as const));

  const peopleQ = peopleQuery.trim().toLowerCase();
  const memberMatchesQ = (handle: string) => {
    if (!peopleQ) return true;
    const dn = identityByHandle.get(handle)?.displayName || '';
    return `${handle}\n${dn}`.toLowerCase().includes(peopleQ);
  };

  const activity = project?.activity || [];
  const kindOf = (text: string) => {
    if (text.startsWith('Invited')) return 'invite';
    if (text.startsWith('Invite revoked')) return 'invite';
    if (text.includes('joined')) return 'member';
    if (text.startsWith('Task ')) return 'task';
    if (text.startsWith('Proposal ')) return 'proposal';
    if (text.startsWith('Changes requested')) return 'review';
    if (text.startsWith('Merged ')) return 'merge';
    if (text.startsWith('Role updated')) return 'member';
    if (text.startsWith('Member removed')) return 'member';
    if (text.startsWith('Access ')) return 'access';
    return 'event';
  };

  const activityByDay = activity.reduce(
    (acc, a) => {
      const day = a.ts.slice(0, 10);
      acc[day] = acc[day] || [];
      acc[day].push(a);
      return acc;
    },
    {} as Record<string, Array<{ ts: string; text: string }>>
  );

  // Summary-first: compute top-level "attention now" counts once.
  const counts = useMemo(() => {
    const needsReview = proposals.filter((p) => p.status === 'needs_review').length;
    const openTasks = tasksGrouped.open.length;
    const inProgressTasks = tasksGrouped.in_progress.length;
    const claimedTasks = tasksGrouped.claimed.length;

    const pendingJoin = (project?.joinRequests || []).filter((r) => r.status === 'pending').length;
    const pendingInvites = (project?.invitations || []).filter((i) => i.status === 'pending').length;
    const pendingTotal = pendingJoin + pendingInvites;

    const fileCount = files.length;
    const selectedFilePath = selectedFile?.path || null;
    const memberCount = project?.members?.length || 0;

    const lastFile = files.length ? [...files].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] : null;
    const lastFileUpdatedAt = lastFile?.updatedAt || null;
    const lastFilePath = lastFile?.path || null;

    const topOpenTask = tasksGrouped.open.length
      ? [...tasksGrouped.open].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]
      : null;

    const topNeedsReview = proposals.filter((p) => p.status === 'needs_review').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;

    return {
      needsReview,
      openTasks,
      inProgressTasks,
      claimedTasks,
      pendingJoin,
      pendingInvites,
      pendingTotal,
      fileCount,
      selectedFilePath,
      memberCount,
      lastFileUpdatedAt,
      lastFilePath,
      topOpenTask,
      topNeedsReview,
    };
  }, [proposals, tasksGrouped, project?.joinRequests, project?.invitations, project?.members, files, selectedFile?.path]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={project ? project.name : 'Project'}
          subtitle={project ? project.summary : `Loading: ${slug}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: slug }]} />}
          actions={
            project ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border border-white/10 px-2 py-1 text-xs ${
                    project.visibility === 'restricted' ? 'bg-amber-500/15 text-amber-100' : 'bg-emerald-500/15 text-emerald-100'
                  }`}
                >
                  {project.visibility}
                </span>

                {myMember ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                    @{myMember.handle} · {myMember.role}
                  </span>
                ) : null}

                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                  @{actor.handle} · {actor.actorType}
                </span>

                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
                    onClick={() => {
                      setExpandTasks(true);
                      document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    Create task
                  </button>
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
              </div>
            ) : null
          }
        />

        {project ? (
          <>
            {/* LAYER 2 — NOW / NEXT */}
            <section id="now" className="scroll-mt-24">
              <Card title="Now / Next">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">Next action</div>
                    <div className="mt-2 grid gap-2">
                      {counts.needsReview ? (
                        <button
                          type="button"
                          className="w-fit rounded-xl bg-amber-500/20 px-2 py-1 text-xs text-amber-100 hover:bg-amber-500/25"
                          onClick={() => {
                            setExpandProposals(true);
                            document.getElementById('proposals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          Review {counts.needsReview} proposal{counts.needsReview === 1 ? '' : 's'}
                        </button>
                      ) : counts.openTasks ? (
                        <button
                          type="button"
                          className="w-fit rounded-xl bg-sky-400/20 px-2 py-1 text-xs text-sky-100 hover:bg-sky-400/25"
                          onClick={() => {
                            setExpandTasks(true);
                            document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          Pick up {counts.openTasks} open task{counts.openTasks === 1 ? '' : 's'}
                        </button>
                      ) : counts.pendingTotal && isOwnerOrMaintainer ? (
                        <button
                          type="button"
                          className="w-fit rounded-xl bg-rose-500/20 px-2 py-1 text-xs text-rose-100 hover:bg-rose-500/25"
                          onClick={() => {
                            setExpandPeople(true);
                            setShowJoinRequests(true);
                            setShowInvites(true);
                            document.getElementById('people')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          Resolve {counts.pendingTotal} pending request{counts.pendingTotal === 1 ? '' : 's'}
                        </button>
                      ) : (
                        <div className="text-xs text-slate-200/60">No urgent items.</div>
                      )}

                      <div className="text-xs text-slate-200/60">
                        {counts.inProgressTasks ? `${counts.inProgressTasks} in progress` : '—'} · {counts.claimedTasks ? `${counts.claimedTasks} claimed` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">Needs review</div>
                    <div className="mt-1 text-lg font-semibold text-slate-50">{counts.needsReview}</div>
                    <div className="mt-2 text-xs text-slate-200/60">{counts.topNeedsReview ? `latest: ${counts.topNeedsReview.title}` : '—'}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">Open tasks</div>
                    <div className="mt-1 text-lg font-semibold text-slate-50">{counts.openTasks}</div>
                    <div className="mt-2 text-xs text-slate-200/60">{counts.topOpenTask ? `suggested: ${counts.topOpenTask.title}` : '—'}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-200/60">Recent file update</div>
                    <div className="mt-1 text-sm text-slate-50">{counts.lastFilePath ? <span className="font-mono">{counts.lastFilePath}</span> : '—'}</div>
                    <div className="mt-1 text-xs text-slate-200/60">{counts.lastFileUpdatedAt ? `updated ${counts.lastFileUpdatedAt}` : '—'}</div>
                  </div>
                </div>
              </Card>
            </section>

            {/* LAYER 3 — CORE WORKSPACE (PRIMARY) */}
            <section id="core" className="scroll-mt-24">
              <Card title="Core workspace">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs font-semibold text-slate-200/70">Tasks</div>
                    <div className="mt-1 text-xs text-slate-200/60">open {tasksGrouped.open.length} · in progress {tasksGrouped.in_progress.length}</div>
                    <button
                      type="button"
                      className="mt-2 w-fit rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => {
                        setExpandTasks(true);
                        document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Open Tasks
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs font-semibold text-slate-200/70">Proposals</div>
                    <div className="mt-1 text-xs text-slate-200/60">needs review {counts.needsReview} · total {proposals.length}</div>
                    <button
                      type="button"
                      className="mt-2 w-fit rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => {
                        setExpandProposals(true);
                        document.getElementById('proposals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Open Proposals
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs font-semibold text-slate-200/70">Files</div>
                    <div className="mt-1 text-xs text-slate-200/60">{files.length} files · selected {selectedFile?.path || '—'}</div>
                    <button
                      type="button"
                      className="mt-2 w-fit rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => {
                        setExpandFiles(true);
                        document.getElementById('files')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Open Files
                    </button>
                  </div>
                </div>
              </Card>
            </section>
          </>
        ) : null}

        <Toast
          message={toast?.message || null}
          variant={toast?.variant || 'info'}
          onClose={() => setToast(null)}
          autoHideMs={4500}
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

                <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/70">
                  {project.visibility === 'open' ? (
                    <>
                      <span className="text-slate-50">Open project:</span> anyone can join instantly. Use this for internal pilots where trust is high.
                    </>
                  ) : (
                    <>
                      <span className="text-slate-50">Restricted project:</span> join requires approval or an invite. Use this when you want a review gate for new humans/agents.
                    </>
                  )}
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-200/70">Active work</div>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => setShowActiveDetails((s) => !s)}
                    >
                      {showActiveDetails ? 'Hide details' : 'Show details'}
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-200/60">Proposals needing review</div>
                      <div className="mt-1 text-lg font-semibold text-slate-50">{proposals.filter((p) => p.status === 'needs_review').length}</div>
                      {showActiveDetails ? (
                        <div className="mt-2 grid gap-1 text-xs">
                          {proposals
                            .filter((p) => p.status === 'needs_review')
                            .slice(0, 3)
                            .map((p) => (
                              <Link key={p.id} className="underline decoration-white/20 hover:decoration-white/50" href={`/proposals/${encodeURIComponent(p.id)}/review`}>
                                {p.title}
                              </Link>
                            ))}
                          {proposals.filter((p) => p.status === 'needs_review').length === 0 ? <div className="text-slate-200/50">None</div> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-200/60">Open tasks</div>
                      <div className="mt-1 text-lg font-semibold text-slate-50">{tasksGrouped.open.length}</div>
                      {showActiveDetails ? (
                        <div className="mt-2 grid gap-1 text-xs">
                          {tasksGrouped.open.slice(0, 3).map((t) => (
                            <Link key={t.id} className="underline decoration-white/20 hover:decoration-white/50" href={`/tasks/${encodeURIComponent(t.id)}`}>
                              {t.title}
                            </Link>
                          ))}
                          {tasksGrouped.open.length === 0 ? <div className="text-slate-200/50">None</div> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-200/60">Recent files</div>
                      {showActiveDetails ? (
                        <div className="mt-2 grid gap-1 text-xs">
                          {[...files]
                            .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
                            .slice(0, 3)
                            .map((f) => (
                              <Link key={f.path} className="underline decoration-white/20 hover:decoration-white/50" href={`/projects/${slug}?file=${encodeURIComponent(f.path)}`}>
                                {f.path}
                              </Link>
                            ))}
                          {files.length === 0 ? <div className="text-slate-200/50">None</div> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-200/60">Pending access / invites</div>
                      <div className="mt-1 text-lg font-semibold text-slate-50">
                        {(project.joinRequests || []).filter((r) => r.status === 'pending').length + (project.invitations || []).filter((i) => i.status === 'pending').length}
                      </div>
                      <div className="mt-2 text-xs text-slate-200/60">
                        join requests {(project.joinRequests || []).filter((r) => r.status === 'pending').length} · invites {(project.invitations || []).filter((i) => i.status === 'pending').length}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* TASKS (PRIMARY) */}
            <section id="tasks" className="scroll-mt-24">
              <div className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface-strong)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-50">Tasks</div>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-200/70">open {tasksGrouped.open.length}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-200/70">in progress {tasksGrouped.in_progress.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-sky-400/20 px-2 py-1 text-[11px] text-sky-100 hover:bg-sky-400/25"
                      onClick={() => {
                        setExpandTasks(true);
                        document.getElementById('tasks-create')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      + Create
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => setExpandTasks((v) => !v)}
                    >
                      {expandTasks ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 text-xs text-slate-200/70">
                    <div>
                      <span className="font-semibold text-slate-100">Summary:</span> {sortedTasks.length} shown · open {tasksGrouped.open.length} · in progress {tasksGrouped.in_progress.length}
                      {tasksGrouped.claimed.length ? <span className="text-slate-200/60"> · claimed {tasksGrouped.claimed.length}</span> : null}
                    </div>
                    <div className="mt-1 text-slate-200/60">
                      {counts.topOpenTask ? (
                        <span>
                          suggested next: <span className="text-slate-100">{counts.topOpenTask.title}</span>
                        </span>
                      ) : (
                        <span>suggested next: —</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                    onClick={() => setExpandTasks((v) => !v)}
                  >
                    {expandTasks ? 'Collapse list' : 'Expand list'}
                  </button>
                </div>

                <Toolbar>
                  <ToolbarGroup>
                    <ToolbarLabel label="Search">
                      <input
                        className="w-[220px] rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={taskQuery}
                        onChange={(e) => setTaskQuery(e.target.value)}
                        placeholder="title, id, file"
                      />
                    </ToolbarLabel>
                    <ToolbarLabel label="Status">
                      <select
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={taskStatus}
                        onChange={(e) =>
                          setTaskStatus(
                            e.target.value === 'open' ||
                              e.target.value === 'claimed' ||
                              e.target.value === 'in_progress' ||
                              e.target.value === 'completed' ||
                              e.target.value === 'unclaimed'
                              ? (e.target.value as any)
                              : 'all'
                          )
                        }
                      >
                        <option value="all">all</option>
                        <option value="open">open</option>
                        <option value="unclaimed">unclaimed</option>
                        <option value="claimed">claimed</option>
                        <option value="in_progress">in progress</option>
                        <option value="completed">completed</option>
                      </select>
                    </ToolbarLabel>
                    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                      <input type="checkbox" checked={taskMine} onChange={(e) => setTaskMine(e.target.checked)} />
                      Mine
                    </label>
                    <ToolbarLabel label="Sort">
                      <select
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={taskSort}
                        onChange={(e) =>
                          setTaskSort(e.target.value === 'created_desc' ? 'created_desc' : e.target.value === 'title_asc' ? 'title_asc' : 'updated_desc')
                        }
                      >
                        <option value="updated_desc">updated ↓</option>
                        <option value="created_desc">created ↓</option>
                        <option value="title_asc">title A→Z</option>
                      </select>
                    </ToolbarLabel>
                  </ToolbarGroup>

                  <div className="text-xs text-slate-200/60">{sortedTasks.length} shown</div>
                </Toolbar>

                <div id="tasks-create" className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
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

                {expandTasks ? (
                  <div className="mt-4 flex flex-col gap-2">
                    {sortedTasks.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-50">
                          <Link className="underline decoration-white/30 hover:decoration-white/60" href={`/tasks/${t.id}`}>
                            {t.title}
                          </Link>{' '}
                          <span className="ml-2 font-mono text-xs text-slate-200/40">{t.id}</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">{t.status}</div>
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
                            const ok = await actions.taskAction(t.id, t.claimedByHandle ? 'unclaim' : 'claim');
                            setToast(ok ? { message: t.claimedByHandle ? 'Task unclaimed.' : 'Task claimed.', variant: 'success' } : { message: 'Task action failed.', variant: 'error' });
                            await actions.loadProject(slug);
                          }}
                        >
                          {t.claimedByHandle ? 'Unclaim' : 'Claim'}
                        </button>
                        <button
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                          type="button"
                          onClick={async () => {
                            const ok = await actions.taskAction(t.id, 'start');
                            setToast(ok ? { message: 'Task started.', variant: 'success' } : { message: 'Task start failed.', variant: 'error' });
                            await actions.loadProject(slug);
                          }}
                        >
                          Start
                        </button>
                        <button
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Mark this task as completed?')) return;
                            const ok = await actions.taskAction(t.id, 'complete');
                            setToast(ok ? { message: 'Task completed.', variant: 'success' } : { message: 'Task complete failed.', variant: 'error' });
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
                    {sortedTasks.length === 0 ? <div className="text-sm text-slate-200/60">No matching tasks.</div> : null}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200/70">
                    List collapsed. Expand to view tasks.
                  </div>
                )}
              </div>
            </section>

            {/* PROPOSALS (PRIMARY) */}
            <section id="proposals" className="scroll-mt-24">
              <div className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface-strong)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-50">Proposals</div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${counts.needsReview ? 'bg-amber-500/20 text-amber-100' : 'bg-white/5 text-slate-200/60'}`}>needs review {counts.needsReview}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-200/70">total {proposals.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-sky-400/20 px-2 py-1 text-[11px] text-sky-100 hover:bg-sky-400/25"
                      onClick={() => {
                        const fp = selectedFile?.path || 'README.md';
                        router.push(`/projects/${slug}/proposals/new?file=${encodeURIComponent(fp)}`);
                      }}
                    >
                      + New
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => setExpandProposals((v) => !v)}
                    >
                      {expandProposals ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 text-xs text-slate-200/70">
                    <div>
                      <span className="font-semibold text-slate-100">Summary:</span> {sortedProposals.length} shown · needs review {proposals.filter((p) => p.status === 'needs_review').length} · merged {proposals.filter((p) => p.status === 'merged').length}
                    </div>
                    <div className="mt-1 text-slate-200/60">
                      {counts.topNeedsReview ? (
                        <span>
                          suggested next: <span className="text-slate-100">{counts.topNeedsReview.title}</span>
                        </span>
                      ) : (
                        <span>suggested next: —</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                    onClick={() => setExpandProposals((v) => !v)}
                  >
                    {expandProposals ? 'Collapse list' : 'Expand list'}
                  </button>
                </div>

                <Toolbar>
                  <ToolbarGroup>
                    <ToolbarLabel label="Search">
                      <input
                        className="w-[240px] rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={proposalQuery}
                        onChange={(e) => setProposalQuery(e.target.value)}
                        placeholder="title, id, file, author"
                      />
                    </ToolbarLabel>
                    <ToolbarLabel label="Status">
                      <select
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={proposalStatus}
                        onChange={(e) =>
                          setProposalStatus(
                            e.target.value === 'needs_review' ||
                              e.target.value === 'approved' ||
                              e.target.value === 'changes_requested' ||
                              e.target.value === 'rejected' ||
                              e.target.value === 'merged'
                              ? (e.target.value as any)
                              : 'all'
                          )
                        }
                      >
                        <option value="all">all</option>
                        <option value="needs_review">needs review</option>
                        <option value="changes_requested">changes requested</option>
                        <option value="approved">approved</option>
                        <option value="merged">merged</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </ToolbarLabel>
                    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                      <input type="checkbox" checked={proposalMine} onChange={(e) => setProposalMine(e.target.checked)} />
                      Mine
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                      <input type="checkbox" checked={showProposalMeta} onChange={(e) => setShowProposalMeta(e.target.checked)} />
                      Meta
                    </label>
                    <ToolbarLabel label="Sort">
                      <select
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={proposalSort}
                        onChange={(e) =>
                          setProposalSort(e.target.value === 'created_desc' ? 'created_desc' : e.target.value === 'title_asc' ? 'title_asc' : 'status_then_created')
                        }
                      >
                        <option value="status_then_created">status → created</option>
                        <option value="created_desc">created ↓</option>
                        <option value="title_asc">title A→Z</option>
                      </select>
                    </ToolbarLabel>
                  </ToolbarGroup>

                  <div className="text-xs text-slate-200/60">{sortedProposals.length} shown</div>
                </Toolbar>

                {expandProposals ? (
                  <div className="mt-3 flex flex-col gap-3">
                    {sortedProposals.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link className="text-sm font-medium underline decoration-white/30 hover:decoration-white/60" href={`/proposals/${p.id}/review`}>
                          {p.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-200/60">
                            {p.createdAt} · {p.status}
                          </span>

                          {isOwnerOrMaintainer ? (
                            <div className="flex flex-wrap gap-2">
                              {p.status === 'needs_review' ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-xl bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-600"
                                    onClick={async () => {
                                      const pr = await actions.proposalAction(p.id, 'approve');
                                      setToast(pr ? { message: 'Proposal approved.', variant: 'success' } : { message: 'Approve failed.', variant: 'error' });
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-xl bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-600"
                                    onClick={async () => {
                                      const note = window.prompt('Request changes note (optional):', '') || '';
                                      const pr = await actions.proposalAction(p.id, 'request_changes', note || undefined);
                                      setToast(pr ? { message: 'Changes requested.', variant: 'success' } : { message: 'Request changes failed.', variant: 'error' });
                                    }}
                                  >
                                    Request changes
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-xl bg-rose-700 px-2 py-1 text-xs text-white hover:bg-rose-600"
                                    onClick={async () => {
                                      if (!window.confirm('Reject this proposal?')) return;
                                      const pr = await actions.proposalAction(p.id, 'reject');
                                      setToast(pr ? { message: 'Proposal rejected.', variant: 'success' } : { message: 'Reject failed.', variant: 'error' });
                                    }}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : null}

                              {p.status === 'approved' ? (
                                <button
                                  type="button"
                                  className="rounded-xl bg-sky-400/20 px-2 py-1 text-xs text-sky-100 hover:bg-sky-400/25"
                                  onClick={async () => {
                                    if (!window.confirm('Merge this proposal? This updates the file in the workspace.')) return;
                                    const pr = await actions.proposalAction(p.id, 'merge');
                                    setToast(pr ? { message: 'Proposal merged.', variant: 'success' } : { message: 'Merge failed.', variant: 'error' });
                                  }}
                                >
                                  Merge
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-200/60">
                        <span className="font-mono">@{p.authorHandle}</span> ({p.authorType}) · <span className="font-mono">{p.filePath}</span>
                      </div>

                      {showProposalMeta ? (
                        <>
                          {identityByHandle.get(p.authorHandle)?.displayName ? (
                            <div className="mt-1 text-xs text-slate-200/50">{identityByHandle.get(p.authorHandle)?.displayName}</div>
                          ) : null}
                          {p.taskId ? (
                            <div className="mt-1 text-xs text-slate-200/60">
                              task{' '}
                              <Link className="font-mono underline decoration-white/30 hover:decoration-white/60" href={`/tasks/${encodeURIComponent(p.taskId)}`}>
                                {p.taskId}
                              </Link>
                            </div>
                          ) : null}

                          {p.lastReview ? (
                            <div className="mt-1 text-xs text-slate-200/70">
                              last: {p.lastReview.action} · @{p.lastReview.actorHandle || 'unknown'} · {String(p.lastReview.createdAt).slice(0, 16).replace('T', ' ')}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-slate-200/40">no review yet</div>
                          )}
                        </>
                      ) : null}
                    </div>
                  ))}
                    {sortedProposals.length === 0 ? <div className="text-sm text-slate-200/60">No matching proposals.</div> : null}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200/70">
                    List collapsed. Expand to view proposals.
                  </div>
                )}
              </div>
            </section>

            {/* FILES (PRIMARY) */}
            <section id="files" className="scroll-mt-24">
              <div className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface-strong)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-50">Files</div>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-200/70">{files.length} files</span>
                    {counts.lastFilePath ? <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-200/70">last {counts.lastFilePath}</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => setExpandFiles((v) => !v)}
                    >
                      {expandFiles ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 text-xs text-slate-200/70">
                    <div>
                      <span className="font-semibold text-slate-100">Summary:</span> {files.length} files · selected <span className="font-mono text-slate-100">{selectedFile?.path || '—'}</span>
                    </div>
                    <div className="mt-1 text-slate-200/60">
                      {counts.lastFilePath ? (
                        <span>
                          last updated: <span className="font-mono text-slate-100">{counts.lastFilePath}</span>
                        </span>
                      ) : (
                        <span>last updated: —</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                    onClick={() => setExpandFiles((v) => !v)}
                  >
                    {expandFiles ? 'Collapse' : 'Expand'}
                  </button>
                </div>

                {expandFiles ? (
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
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/60">
                          <span>
                            updated {selectedFile?.updatedAt || '—'}
                            {selectedFile?.lastActorHandle ? (
                              <span className="ml-2">
                                by @{selectedFile.lastActorHandle} ({selectedFile.lastActorType || '—'})
                              </span>
                            ) : null}
                            {selectedFile?.lastProposalId ? (
                              <span className="ml-2">
                                via{' '}
                                <Link
                                  className="underline decoration-white/30 hover:decoration-white/60"
                                  href={`/proposals/${encodeURIComponent(selectedFile.lastProposalId)}/review`}
                                >
                                  {selectedFile.lastProposalId}
                                </Link>
                              </span>
                            ) : null}
                          </span>

                          {selectedFile ? (
                            <>
                              <Link
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10"
                                href={`/projects/${slug}?file=${encodeURIComponent(selectedFile.path)}#tasks`}
                              >
                                Create task
                              </Link>
                              <Link
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10"
                                href={`/projects/${slug}/proposals/new?file=${encodeURIComponent(selectedFile.path)}`}
                              >
                                Propose change
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={`mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-4 leading-relaxed text-slate-100 ${
                          selectedFile?.path?.toLowerCase().endsWith('.md') ? 'text-sm' : 'font-mono text-xs'
                        }`}
                      >
                        {selectedFile?.content || '—'}
                      </div>

                      {selectedFile ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs font-semibold text-slate-200/70">Related proposals</div>
                            <div className="mt-2 grid gap-1 text-xs">
                              {proposals
                                .filter((p) => p.filePath === selectedFile.path)
                                .slice(0, 5)
                                .map((p) => (
                                  <Link
                                    key={p.id}
                                    className="rounded-xl px-2 py-1 text-slate-100 hover:bg-white/5"
                                    href={`/proposals/${encodeURIComponent(p.id)}/review`}
                                  >
                                    <span className="font-mono">{p.id}</span> · {p.status} · {String(p.createdAt).slice(0, 10)}
                                  </Link>
                                ))}
                              {proposals.filter((p) => p.filePath === selectedFile.path).length === 0 ? (
                                <div className="text-slate-200/60">None</div>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs font-semibold text-slate-200/70">Related tasks</div>
                            <div className="mt-2 grid gap-1 text-xs">
                              {tasks
                                .filter((t) => t.filePath === selectedFile.path)
                                .slice(0, 5)
                                .map((t) => (
                                  <Link
                                    key={t.id}
                                    className="rounded-xl px-2 py-1 text-slate-100 hover:bg-white/5"
                                    href={`/tasks/${encodeURIComponent(t.id)}`}
                                  >
                                    <span className="font-mono">{t.id}</span> · {t.status}
                                  </Link>
                                ))}
                              {tasks.filter((t) => t.filePath === selectedFile.path).length === 0 ? (
                                <div className="text-slate-200/60">None</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200/70">
                      Files collapsed. Expand to browse the file tree and content.
                    </div>
                  )}
              </div>
            </section>

            {/* DECISIONS */}
            <section id="decisions" className="scroll-mt-24">
              <Card title="Decisions">
                <div className="text-xs text-slate-200/60">First-class artifact: DECISIONS.md</div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-100">
                  {(() => {
                    const raw = files.find((f) => f.path === 'DECISIONS.md')?.content || '';
                    if (!raw.trim()) return '(no DECISIONS.md)';
                    const picked = raw
                      .split('\n')
                      .map((l) => l.trimEnd())
                      .filter((l) => l.startsWith('##') || l.startsWith('- '))
                      .slice(0, 12);
                    return picked.length ? picked.join('\n') : raw.split('\n').slice(0, 12).join('\n');
                  })()}
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 text-xs text-slate-200/70">
                    <div>
                      <span className="font-semibold text-slate-100">Summary:</span> {(project.members || []).length} members · {(project.joinRequests || []).filter((r) => r.status === 'pending').length} join req · {(project.invitations || []).filter((i) => i.status === 'pending').length} invites
                    </div>
                    <div className="mt-1 text-slate-200/60">
                      {isOwnerOrMaintainer && counts.pendingTotal ? (
                        <span>
                          suggested next: <span className="text-slate-100">review pending requests</span>
                        </span>
                      ) : (
                        <span>suggested next: —</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                    onClick={() => setExpandPeople((v) => !v)}
                  >
                    {expandPeople ? 'Collapse' : 'Expand'}
                  </button>
                </div>

                <div className="text-xs text-slate-200/60">Join mode: {project.visibility}</div>

                {expandPeople ? (
                  <>
                    <div className="mt-3">
                  <Toolbar>
                    <ToolbarGroup>
                      <ToolbarLabel label="Search">
                        <input
                          className="w-[240px] rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                          value={peopleQuery}
                          onChange={(e) => setPeopleQuery(e.target.value)}
                          placeholder="handle / display name"
                        />
                      </ToolbarLabel>
                      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                        <input type="checkbox" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} />
                        Pending only
                      </label>
                    </ToolbarGroup>
                    <div className="text-xs text-slate-200/60">
                      {(project.members || []).length} members · {(project.joinRequests || []).filter((r) => r.status === 'pending').length} join req ·{' '}
                      {(project.invitations || []).filter((i) => i.status === 'pending').length} invites
                    </div>
                  </Toolbar>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">Humans</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-200/80">
                      {(project.members || [])
                        .filter((m) => m.memberType === 'human' && memberMatchesQ(m.handle))
                        .map((m) => (
                          <li key={m.handle}>
                            @{m.handle}
                            {identityByHandle.get(m.handle)?.displayName ? (
                              <span className="text-slate-200/40"> — {identityByHandle.get(m.handle)?.displayName}</span>
                            ) : null}
                            <span className="text-slate-200/40"> · {m.role}</span>
                          </li>
                        ))}
                      {(project.members || []).filter((m) => m.memberType === 'human' && memberMatchesQ(m.handle)).length === 0 ? <li>None</li> : null}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">Agents</div>
                    <div className="mt-2 flex flex-col gap-2">
                      {(project.members || [])
                        .filter((m) => m.memberType === 'agent' && memberMatchesQ(m.handle))
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
                      {(project.members || []).filter((m) => m.memberType === 'agent' && memberMatchesQ(m.handle)).length === 0 ? (
                        <div className="text-sm text-slate-200/60">None</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {isOwnerOrMaintainer ? (
                  <div className="mt-6 grid gap-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-semibold text-slate-200/70">Owner / Maintainer controls</div>
                    {/* Join requests */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-200/70">
                          Join requests{' '}
                          <span className="text-slate-200/40">({(project.joinRequests || []).filter((r) => r.status === 'pending').length} pending)</span>
                        </div>
                        <button
                          type="button"
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                          onClick={() => setShowJoinRequests((s) => !s)}
                        >
                          {showJoinRequests ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      {showJoinRequests ? (
                        <ul className="mt-2 list-disc pl-5 text-sm text-slate-200/80">
                          {(project.joinRequests || [])
                            .filter((r) => (!showPendingOnly || r.status === 'pending') && memberMatchesQ(r.handle))
                            .map((r) => (
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
                                      onClick={async () => {
                                        const role = reqRoles[r.id] || 'contributor';
                                        const ok = await actions.reviewJoinRequest(r.id, 'approve', role);
                                        setToast(ok ? { message: `Join request approved (${role}).`, variant: 'success' } : { message: 'Approve failed.', variant: 'error' });
                                        await actions.loadProject(slug);
                                      }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="rounded-xl bg-rose-700 px-2 py-1 text-xs text-white hover:bg-rose-600"
                                      type="button"
                                      onClick={async () => {
                                        if (!window.confirm(`Reject join request from @${r.handle}?`)) return;
                                        const ok = await actions.reviewJoinRequest(r.id, 'reject');
                                        setToast(ok ? { message: 'Join request rejected.', variant: 'success' } : { message: 'Reject failed.', variant: 'error' });
                                        await actions.loadProject(slug);
                                      }}
                                    >
                                      Reject
                                    </button>
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          {(project.joinRequests || []).length === 0 ? <li>No join requests</li> : null}
                        </ul>
                      ) : null}
                    </div>

                    {/* Invitations */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-200/70">
                          Invitations{' '}
                          <span className="text-slate-200/40">({(project.invitations || []).filter((i) => i.status === 'pending').length} pending)</span>
                        </div>
                        <button
                          type="button"
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                          onClick={() => setShowInvites((s) => !s)}
                        >
                          {showInvites ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      {showInvites ? (
                        <div className="mt-2 grid gap-2">
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="grid gap-1">
                              <span className="text-xs text-slate-200/60">Handle</span>
                              <input
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                                value={inviteHandle}
                                onChange={(e) => setInviteHandle(e.target.value)}
                                placeholder="e.g. oc_agent_example"
                              />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-xs text-slate-200/60">Type</span>
                              <select
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                                value={inviteType}
                                onChange={(e) => setInviteType(e.target.value === 'human' ? 'human' : 'agent')}
                              >
                                <option value="agent">agent</option>
                                <option value="human">human</option>
                              </select>
                            </label>
                            <label className="grid gap-1">
                              <span className="text-xs text-slate-200/60">Role</span>
                              <select
                                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value === 'maintainer' ? 'maintainer' : 'contributor')}
                              >
                                <option value="contributor">contributor</option>
                                <option value="maintainer">maintainer</option>
                              </select>
                            </label>
                            <button
                              type="button"
                              className="rounded-xl bg-sky-400/20 px-2 py-1 text-xs text-sky-100 hover:bg-sky-400/25"
                              onClick={async () => {
                                setPeopleMsg(null);
                                const res = await fetch(`/api/projects/${encodeURIComponent(slug)}/invites`, {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({
                                    inviteeHandle: inviteHandle,
                                    inviteeType: inviteType,
                                    role: inviteRole,
                                    actorHandle: actor.handle,
                                    actorType: actor.actorType,
                                  }),
                                });
                                const j = await res.json().catch(() => null);
                                if (!res.ok || !j?.ok) {
                                  setPeopleMsg(j?.error || 'invite_failed');
                                  return;
                                }
                                setInviteHandle('');
                                setPeopleMsg('Invite created. The invitee can now join and it will auto-accept.');
                                await actions.loadProject(slug);
                              }}
                            >
                              Invite
                            </button>
                          </div>

                          {peopleMsg ? <div className="text-xs text-slate-200/70">{peopleMsg}</div> : null}

                          <div className="grid gap-2">
                            {(project.invitations || [])
                              .filter((inv) => (!showPendingOnly || inv.status === 'pending') && memberMatchesQ(inv.handle))
                              .map((inv) => (
                                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                                  <div>
                                    <span className="font-mono">@{inv.handle}</span> ({inv.memberType}) · {inv.role} · {inv.status}
                                    <div className="text-slate-200/50">invited by @{inv.createdByHandle}</div>
                                  </div>
                                  {inv.status === 'pending' ? (
                                    <button
                                      type="button"
                                      className="rounded-xl bg-rose-700 px-2 py-1 text-xs text-white hover:bg-rose-600"
                                      onClick={async () => {
                                        if (!window.confirm(`Revoke invite for @${inv.handle}?`)) return;
                                        const res = await fetch(`/api/invites/${encodeURIComponent(inv.id)}/action`, {
                                          method: 'POST',
                                          headers: { 'content-type': 'application/json' },
                                          body: JSON.stringify({ actorHandle: actor.handle }),
                                        });
                                        const j = await res.json().catch(() => null);
                                        if (!res.ok || !j?.ok) {
                                          setPeopleMsg(j?.error || 'revoke_failed');
                                          setToast({ message: j?.error || 'Revoke failed.', variant: 'error' });
                                          return;
                                        }
                                        setPeopleMsg('Invite revoked.');
                                        setToast({ message: 'Invite revoked.', variant: 'success' });
                                        await actions.loadProject(slug);
                                      }}
                                    >
                                      Revoke
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                            {(project.invitations || []).length === 0 ? <div className="text-xs text-slate-200/60">No invites yet.</div> : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Member operations */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-200/70">Member operations</div>
                        <button
                          type="button"
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                          onClick={() => setShowMemberOps((s) => !s)}
                        >
                          {showMemberOps ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      {showMemberOps ? (
                        <div className="mt-2 grid gap-2">
                          {(project.members || []).filter((m) => memberMatchesQ(m.handle)).map((m) => (
                            <div key={`${m.memberType}:${m.handle}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                              <div>
                                <span className="font-mono">@{m.handle}</span> ({m.memberType})
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                                  value={m.role}
                                  onChange={async (e) => {
                                    const role = e.target.value === 'maintainer' ? 'maintainer' : e.target.value === 'owner' ? 'owner' : 'contributor';
                                    if (!window.confirm(`Update @${m.handle} role to ${role}?`)) return;
                                    const res = await fetch(`/api/projects/${encodeURIComponent(slug)}/members/action`, {
                                      method: 'POST',
                                      headers: { 'content-type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'set_role',
                                        memberHandle: m.handle,
                                        memberType: m.memberType,
                                        role,
                                        actorHandle: actor.handle,
                                      }),
                                    });
                                    const j = await res.json().catch(() => null);
                                    if (!res.ok || !j?.ok) {
                                      setPeopleMsg(j?.error || 'role_update_failed');
                                      setToast({ message: j?.error || 'Role update failed.', variant: 'error' });
                                    } else {
                                      setPeopleMsg('Role updated.');
                                      setToast({ message: 'Role updated.', variant: 'success' });
                                    }
                                    await actions.loadProject(slug);
                                  }}
                                >
                                  <option value="contributor">contributor</option>
                                  <option value="maintainer">maintainer</option>
                                  <option value="owner">owner</option>
                                </select>
                                <button
                                  type="button"
                                  className="rounded-xl bg-rose-700 px-2 py-1 text-xs text-white hover:bg-rose-600"
                                  onClick={async () => {
                                    if (!window.confirm(`Remove @${m.handle} from this project?`)) return;
                                    const res = await fetch(`/api/projects/${encodeURIComponent(slug)}/members/action`, {
                                      method: 'POST',
                                      headers: { 'content-type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'remove',
                                        memberHandle: m.handle,
                                        memberType: m.memberType,
                                        actorHandle: actor.handle,
                                      }),
                                    });
                                    const j = await res.json().catch(() => null);
                                    if (!res.ok || !j?.ok) {
                                      setPeopleMsg(j?.error || 'remove_failed');
                                      setToast({ message: j?.error || 'Remove failed.', variant: 'error' });
                                    } else {
                                      setPeopleMsg('Member removed.');
                                      setToast({ message: 'Member removed.', variant: 'success' });
                                    }
                                    await actions.loadProject(slug);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                  </>
                ) : (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200/70">
                    People collapsed. Expand to manage members, invites, and requests.
                  </div>
                )}
              </Card>

              <div id="join-agent" className="scroll-mt-24">
                <Card title="Join as Agent (external)">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-200/60">Copy/paste intake instructions (no automation; identity + join/request only).</div>
                    <a
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
                      href={`/intake/agent?project=${encodeURIComponent(slug)}`}
                    >
                      Open intake form
                    </a>
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200/70">
                    Use the intake form to bind an external agent identity and join/request access.
                    <div className="mt-2 text-slate-200/60">(Technical curl instructions live on the intake page, not here.)</div>
                  </div>
                </Card>
              </div>
            </section>

            {/* LAYER 5 — HISTORY / ADVANCED */}
            {/* TIMELINE */}
            <section id="timeline" className="scroll-mt-24">
              <Card title="Timeline (history)">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-200/70">
                    <span className="font-semibold text-slate-100">Summary:</span> {activity.length} events · showing recent days first
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                    onClick={() => setExpandTimeline((v) => !v)}
                  >
                    {expandTimeline ? 'Collapse' : 'Expand'}
                  </button>
                </div>

                {expandTimeline ? (
                  <>
                    <Toolbar>
                      <ToolbarGroup>
                    <ToolbarLabel label="Filter">
                      <select
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={timelineKindFilter}
                        onChange={(e) =>
                          setTimelineKindFilter(
                            e.target.value === 'task' ||
                              e.target.value === 'proposal' ||
                              e.target.value === 'review' ||
                              e.target.value === 'merge' ||
                              e.target.value === 'invite' ||
                              e.target.value === 'member' ||
                              e.target.value === 'access' ||
                              e.target.value === 'event'
                              ? (e.target.value as any)
                              : 'all'
                          )
                        }
                      >
                        <option value="all">all</option>
                        <option value="task">task</option>
                        <option value="proposal">proposal</option>
                        <option value="review">review</option>
                        <option value="merge">merge</option>
                        <option value="invite">invite</option>
                        <option value="member">member</option>
                        <option value="access">access</option>
                        <option value="event">event</option>
                      </select>
                    </ToolbarLabel>
                    <ToolbarLabel label="Search">
                      <input
                        className="w-[240px] rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={timelineQuery}
                        onChange={(e) => setTimelineQuery(e.target.value)}
                        placeholder="text / @handle"
                      />
                    </ToolbarLabel>
                      </ToolbarGroup>
                      <div className="text-xs text-slate-200/60">{activity.length} events</div>
                    </Toolbar>

                    <div className="mt-3 grid gap-4">
                  {Object.keys(activityByDay)
                    .sort()
                    .reverse()
                    .slice(0, 7)
                    .map((day) => (
                      <div key={day} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-semibold text-slate-200/70">{day}</div>
                        <div className="mt-2 grid gap-2">
                          {activityByDay[day]
                            .filter((a) => {
                              const k = kindOf(a.text) as any;
                              if (timelineKindFilter !== 'all' && k !== timelineKindFilter) return false;
                              const q = timelineQuery.trim().toLowerCase();
                              if (!q) return true;
                              return `${a.text}\n${a.ts}`.toLowerCase().includes(q);
                            })
                            .slice(0, 12)
                            .map((a, idx) => {
                              const k = kindOf(a.text);
                              return (
                                <div key={idx} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="min-w-0">
                                  <div className="text-xs text-slate-200/50">{a.ts.slice(11, 19)}</div>
                                  <div className="mt-1 text-sm text-slate-50">{a.text}</div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">{k}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                      {activity.length === 0 ? <div className="text-sm text-slate-200/60">No activity yet.</div> : null}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200/70">
                    Timeline collapsed. Expand to view recent activity.
                  </div>
                )}
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
